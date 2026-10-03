

#include <windows.h>
#include <shlwapi.h>
#include <shlobj.h>
#include <shellapi.h>
#include <commdlg.h>
#include <tlhelp32.h>
#include <wrl.h>
#include <wrl/client.h>

#include <string>
#include <vector>
#include <thread>
#include <algorithm>

#include "WebView2.h"
#include "../thirdparty/json.hpp"

using json = nlohmann::json;
using Microsoft::WRL::ComPtr;
using Microsoft::WRL::Callback;

#pragma comment(lib, "shlwapi.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "comdlg32.lib")
#pragma comment(lib, "advapi32.lib")


static std::wstring Utf8ToWide(const std::string& s) {
  if (s.empty()) return L"";
  int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), nullptr, 0);
  if (n <= 0) return L"";
  std::wstring w((size_t)n, 0);
  MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), w.data(), n);
  return w;
}

static std::string WideToUtf8(const std::wstring& ws) {
  if (ws.empty()) return {};
  int n = WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), (int)ws.size(), nullptr, 0, nullptr, nullptr);
  if (n <= 0) return {};
  std::string s((size_t)n, 0);
  WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), (int)ws.size(), s.data(), n, nullptr, nullptr);
  return s;
}

static std::wstring LowerW(std::wstring s) {
  for (auto& c : s) c = (wchar_t)towlower(c);
  return s;
}

static bool EndsWithW(const std::wstring& s, const std::wstring& suffix) {
  if (suffix.size() > s.size()) return false;
  return LowerW(s.substr(s.size() - suffix.size())) == LowerW(suffix);
}

static bool FileExistsW(const std::wstring& p) {
  DWORD a = GetFileAttributesW(p.c_str());
  return (a != INVALID_FILE_ATTRIBUTES) && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

static std::wstring ExpandEnvW(const std::wstring& s) {
  DWORD n = ExpandEnvironmentStringsW(s.c_str(), nullptr, 0);
  if (n == 0) return s;
  std::wstring out(n, 0);
  DWORD r = ExpandEnvironmentStringsW(s.c_str(), out.data(), n);
  if (r == 0) return s;
  while (!out.empty() && out.back() == L'\0') out.pop_back();
  return out;
}

static std::wstring GetExeDirW() {
  wchar_t buf[MAX_PATH * 4] = {0};
  GetModuleFileNameW(nullptr, buf, (DWORD)(sizeof(buf) / sizeof(buf[0])));
  std::wstring p = buf;
  size_t i = p.find_last_of(L"\\/");
  return (i == std::wstring::npos) ? L"." : p.substr(0, i);
}

static std::wstring FindIndexHtml() {
  std::wstring exeDir = GetExeDirW();
  std::wstring dir = exeDir;
  for (int i = 0; i < 5; i++) {
    std::wstring cand = dir + L"\\index.html";
    if (FileExistsW(cand)) return cand;
    size_t p = dir.find_last_of(L"\\/");
    if (p == std::wstring::npos || p < 3) break;
    dir = dir.substr(0, p);
  }
  wchar_t cwd[MAX_PATH * 4] = {0};
  GetCurrentDirectoryW((DWORD)(sizeof(cwd) / sizeof(cwd[0])), cwd);
  dir = cwd;
  for (int i = 0; i < 4; i++) {
    std::wstring cand = dir + L"\\index.html";
    if (FileExistsW(cand)) return cand;
    size_t p = dir.find_last_of(L"\\/");
    if (p == std::wstring::npos || p < 3) break;
    dir = dir.substr(0, p);
  }
  return exeDir + L"\\index.html";
}

static std::wstring ToFileUrl(const std::wstring& path) {
  std::wstring u = path;
  std::wstring out;
  out.reserve(u.size() + 16);
  for (wchar_t c : u) {
    if (c == L'\\') out += L'/';
    else if (c == L' ') out += L"%20";
    else if (c == L'%') out += L"%25";
    else if (c == L'#') out += L"%23";
    else out += c;
  }
  if (out.compare(0, 8, L"file:///") != 0) out = L"file:///" + out;
  return out;
}

static std::wstring GetLocalAppDataW() {
  wchar_t buf[MAX_PATH * 4] = {0};
  if (SUCCEEDED(SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, 0, buf))) return buf;
  return L"";
}

static std::wstring GetSafeProjectsDirW() {
  std::wstring base = GetLocalAppDataW();
  std::wstring dir;
  if (!base.empty()) {
    dir = base + L"\\RMG\\projects";
  } else {
    wchar_t tmp[MAX_PATH * 4] = {0};
    GetTempPathW((DWORD)(sizeof(tmp) / sizeof(tmp[0])), tmp);
    dir = std::wstring(tmp) + L"RMG\\projects";
  }
  SHCreateDirectoryExW(nullptr, dir.c_str(), nullptr);
  return dir;
}

static bool WriteFileBytesW(const std::wstring& path, const uint8_t* data, size_t len, std::string& err) {
  HANDLE h = CreateFileW(path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (h == INVALID_HANDLE_VALUE) {
    err = "CreateFile failed, code=" + std::to_string(GetLastError());
    return false;
  }
  size_t done = 0;
  while (done < len) {
    DWORD chunk = (DWORD)((len - done > 1 * 1024 * 1024) ? 1 * 1024 * 1024 : (len - done));
    DWORD wrote = 0;
    if (!WriteFile(h, data + done, chunk, &wrote, nullptr) || wrote == 0) {
      err = "WriteFile failed, code=" + std::to_string(GetLastError());
      CloseHandle(h);
      return false;
    }
    done += wrote;
  }
  CloseHandle(h);
  return true;
}


static bool IsLmmsRunning() {
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snap == INVALID_HANDLE_VALUE) return false;
  PROCESSENTRY32W pe{};
  pe.dwSize = sizeof(pe);
  bool found = false;
  if (Process32FirstW(snap, &pe)) {
    do {
      if (_wcsicmp(pe.szExeFile, L"lmms.exe") == 0) { found = true; break; }
    } while (Process32NextW(snap, &pe));
  }
  CloseHandle(snap);
  return found;
}

struct FindCtx { HWND hwnd = nullptr; };

static BOOL CALLBACK EnumLmmsWnd(HWND hwnd, LPARAM lp) {
  if (!IsWindowVisible(hwnd)) return TRUE;
  wchar_t title[512] = {0};
  GetWindowTextW(hwnd, title, 512);
  std::wstring t = LowerW(title);
  if (t.find(L"lmms") != std::wstring::npos) {
    ((FindCtx*)lp)->hwnd = hwnd;
    return FALSE;
  }
  return TRUE;
}

static void FocusLmmsAndPaste() {
  FindCtx ctx;
  EnumWindows(EnumLmmsWnd, (LPARAM)&ctx);
  if (!ctx.hwnd) return;
  HWND target = ctx.hwnd;
  std::thread([target]() {
    SetForegroundWindow(target);
    Sleep(250);
    INPUT in[4] = {};
    for (int i = 0; i < 4; i++) in[i].type = INPUT_KEYBOARD;
    in[0].ki.wVk = VK_CONTROL;
    in[1].ki.wVk = 'V';
    in[2].ki.wVk = 'V';         in[2].ki.dwFlags = KEYEVENTF_KEYUP;
    in[3].ki.wVk = VK_CONTROL;  in[3].ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(4, in, sizeof(INPUT));
  }).detach();
}

static bool SetClipboardTextW(HWND owner, const std::wstring& text) {
  if (!OpenClipboard(owner)) return false;
  EmptyClipboard();
  size_t bytes = (text.size() + 1) * sizeof(wchar_t);
  HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, bytes);
  if (!h) { CloseClipboard(); return false; }
  void* p = GlobalLock(h);
  memcpy(p, text.c_str(), bytes);
  GlobalUnlock(h);
  if (!SetClipboardData(CF_UNICODETEXT, h)) {
    GlobalFree(h);
    CloseClipboard();
    return false;
  }
  CloseClipboard();
  return true;
}

static std::wstring QueryRegDefault(HKEY hive, const std::wstring& subkey) {
  HKEY h = nullptr;
  if (RegOpenKeyExW(hive, subkey.c_str(), 0, KEY_READ, &h) != ERROR_SUCCESS) return L"";
  wchar_t buf[MAX_PATH * 4] = {0};
  DWORD cb = sizeof(buf), type = 0;
  LONG rc = RegQueryValueExW(h, nullptr, nullptr, &type, (LPBYTE)buf, &cb);
  RegCloseKey(h);
  if (rc != ERROR_SUCCESS) return L"";
  if (type != REG_SZ && type != REG_EXPAND_SZ) return L"";
  std::wstring v = buf;
  if (type == REG_EXPAND_SZ) v = ExpandEnvW(v);
  while (!v.empty() && (v.back() == L'\0' || v.back() == L'"')) v.pop_back();
  while (!v.empty() && v.front() == L'"') v.erase(v.begin());
  return v;
}

static std::pair<std::wstring, std::string> FindLmmsExecutable(const std::wstring& custom) {
  if (!custom.empty() && FileExistsW(custom)) return {custom, "custom"};

  const std::wstring appPaths = L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\lmms.exe";
  std::wstring v = QueryRegDefault(HKEY_LOCAL_MACHINE, appPaths);
  if (!v.empty() && FileExistsW(v)) return {v, "registry"};
  v = QueryRegDefault(HKEY_CURRENT_USER, appPaths);
  if (!v.empty() && FileExistsW(v)) return {v, "registry"};

  wchar_t found[MAX_PATH * 4] = {0};
  if (SearchPathW(nullptr, L"lmms.exe", nullptr, (DWORD)(sizeof(found) / sizeof(found[0])), found, nullptr) > 0) {
    if (FileExistsW(found)) return {found, "path"};
  }

  const wchar_t* cands[] = {
    L"%ProgramFiles%\\LMMS\\lmms.exe",
    L"%ProgramFiles(x86)%\\LMMS\\lmms.exe",
    L"D:\\LMMS\\lmms.exe",
    L"E:\\LMMS\\lmms.exe",
    L"F:\\LMMS\\lmms.exe",
    L"C:\\LMMS\\lmms.exe",
    L"%LOCALAPPDATA%\\Programs\\LMMS\\lmms.exe",
    L"%USERPROFILE%\\scoop\\apps\\lmms\\current\\lmms.exe",
    L"%ChocolateyInstall%\\bin\\lmms.exe",
    L"C:\\ProgramData\\chocolatey\\bin\\lmms.exe",
  };
  for (auto c : cands) {
    std::wstring e = ExpandEnvW(c);
    if (!e.empty() && FileExistsW(e)) return {e, "system"};
  }
  return {L"", "none"};
}


static HWND g_hwnd = nullptr;
static ComPtr<ICoreWebView2Controller> g_controller;
static ComPtr<ICoreWebView2> g_webview;

static const wchar_t* kBridgeShim = LR"SHIM(
(function () {
  if (window.rmgAPI) return;
  var seq = 0, pending = {};
  function call(method, payload) {
    return new Promise(function (resolve) {
      var id = 'm' + (++seq) + '_' + Date.now();
      pending[id] = resolve;
      try {
        window.chrome.webview.postMessage({ id: id, method: method, payload: payload || {} });
      } catch (e) { resolve({ success: false, error: String(e) }); }
    });
  }
  window.rmgAPI = {
    saveFile: function (p) { return call('saveFile', p); },
    launchLMMS: function (p) { return call('launchLMMS', p); },
    getLmmsPath: function (c) { return call('getLmmsPath', { customPath: c || null }); },
    selectLmmsPath: function () { return call('selectLmmsPath', {}); },
    openFile: function (o) { return call('openFile', o || {}); },
    saveFileDirect: function (o) { return call('saveFileDirect', o || {}); },
    listFiles: function (o) { return call('listFiles', o || {}); },
    readFileDirect: function (o) { return call('readFileDirect', o || {}); },
    deleteFile: function (o) { return call('deleteFile', o || {}); },
    getExportDir: function () { return call('getExportDir', {}); },
    setExportDir: function () { return call('setExportDir', {}); },
    openFolder: function (o) { return call('openFolder', o || {}); },
    quitApp: function () { return call('quitApp', {}); },
    copyLmmsClip: function (o) { return call('copyLmmsClip', o || {}); }
  };
  window.__rmgResolve = function (id, result) {
    var r = pending[id];
    if (r) { delete pending[id]; try { r(result); } catch (e) {} }
  };
})();
)SHIM";

static void ReplyWeb(const std::string& id, const json& res) {
  if (!g_webview) return;
  std::string script = "window.__rmgResolve(" + json(id).dump() + "," + res.dump() + ");";
  g_webview->ExecuteScript(Utf8ToWide(script).c_str(), nullptr);
}

static std::vector<uint8_t> ExtractBytes(const json& data, bool& isText, std::string& text) {
  std::vector<uint8_t> out;
  isText = false;
  if (data.is_string()) {
    isText = true;
    text = data.get<std::string>();
    return out;
  }
  if (data.is_array()) {
    out.reserve(data.size());
    for (auto& el : data) out.push_back((uint8_t)(el.is_number() ? (el.get<int>() & 0xFF) : 0));
  } else if (data.is_object()) {
    std::vector<std::pair<long long, int>> kv;
    for (auto it = data.begin(); it != data.end(); ++it) {
      try {
        long long k = std::stoll(it.key());
        int val = it->is_number() ? (it->get<int>() & 0xFF) : 0;
        kv.push_back({k, val});
      } catch (...) {}
    }
    std::sort(kv.begin(), kv.end());
    out.reserve(kv.size());
    for (auto& p : kv) out.push_back((uint8_t)p.second);
  }
  return out;
}

static json HandleSaveFile(const json& payload) {
  std::string defaultName = payload.value("defaultName", std::string("RinTune_Song.mmp"));
  std::string type = payload.value("type", std::string("mmp"));
  auto lower = [](std::string s) {
    for (auto& c : s) c = (char)tolower((unsigned char)c);
    return s;
  };
  std::string ln = lower(defaultName);
  bool isMidi = (type == "midi") || (ln.size() > 4 && ln.compare(ln.size() - 4, 4, ".mid") == 0);
  bool isRmg = (type == "rmg") || (ln.size() > 4 && ln.compare(ln.size() - 4, 4, ".rmg") == 0);
  bool isWav = (type == "wav") || (ln.size() > 4 && ln.compare(ln.size() - 4, 4, ".wav") == 0);

  const wchar_t* filter = isMidi
    ? L"MIDI Files (*.mid)\0*.mid\0All Files (*.*)\0*.*\0"
    : (isRmg
      ? L"RinTune Project Files (*.rmg)\0*.rmg\0All Files (*.*)\0*.*\0"
      : (isWav
        ? L"WAV Audio (*.wav)\0*.wav\0All Files (*.*)\0*.*\0"
        : L"LMMS Project Files (*.mmp)\0*.mmp\0All Files (*.*)\0*.*\0"));
  const wchar_t* defExt = isMidi ? L"mid" : (isRmg ? L"rmg" : (isWav ? L"wav" : L"mmp"));

  std::wstring wName = Utf8ToWide(defaultName);
  std::vector<wchar_t> fileBuf(32768, 0);
  wcsncpy_s(fileBuf.data(), fileBuf.size(), wName.c_str(), _TRUNCATE);

  OPENFILENAMEW ofn{};
  ofn.lStructSize = sizeof(ofn);
  ofn.hwndOwner = g_hwnd;
  ofn.lpstrFilter = filter;
  ofn.nFilterIndex = 1;
  ofn.lpstrFile = fileBuf.data();
  ofn.nMaxFile = (DWORD)fileBuf.size();
  ofn.lpstrDefExt = defExt;
  ofn.Flags = OFN_OVERWRITEPROMPT | OFN_NOCHANGEDIR | OFN_PATHMUSTEXIST;

  if (!GetSaveFileNameW(&ofn)) {
    DWORD err = CommDlgExtendedError();
    if (err == 0) return json{{"success", false}, {"cancelled", true}};
    return json{{"success", false}, {"error", "Save dialog failed, code=" + std::to_string(err)}};
  }
  std::wstring outPath = fileBuf.data();

  bool isText = false;
  std::string text;
  std::vector<uint8_t> bytes;
  if (payload.contains("data")) {
    bytes = ExtractBytes(payload["data"], isText, text);
  }

  std::string werr;
  bool ok;
  if (isText) {
    ok = WriteFileBytesW(outPath, (const uint8_t*)text.data(), text.size(), werr);
  } else {
    ok = WriteFileBytesW(outPath, bytes.data(), bytes.size(), werr);
  }
  if (!ok) return json{{"success", false}, {"error", werr}};
  return json{{"success", true}, {"filePath", WideToUtf8(outPath)}};
}

static UINT GetLmmsClipboardFormat() {
  static UINT fmt = 0;
  if (!fmt) fmt = RegisterClipboardFormatW(L"application/x-lmms-clipboard");
  return fmt;
}

static bool CopyLmmsClipToSystem(const std::string& xmlUtf8, bool& verified) {
  verified = false;
  if (xmlUtf8.empty() || xmlUtf8.size() > 16 * 1024 * 1024) return false;
  if (!OpenClipboard(g_hwnd)) return false;
  EmptyClipboard();

  bool okText = false, okMime = false;
  std::wstring xmlW = Utf8ToWide(xmlUtf8);

  HGLOBAL h1 = GlobalAlloc(GMEM_MOVEABLE, (xmlW.size() + 1) * sizeof(wchar_t));
  if (h1) {
    memcpy(GlobalLock(h1), xmlW.c_str(), (xmlW.size() + 1) * sizeof(wchar_t));
    GlobalUnlock(h1);
    if (SetClipboardData(CF_UNICODETEXT, h1)) okText = true;
    else GlobalFree(h1);
  }

  UINT fmt = GetLmmsClipboardFormat();
  if (fmt) {
    HGLOBAL h2 = GlobalAlloc(GMEM_MOVEABLE, xmlUtf8.size() + 1);
    if (h2) {
      memcpy(GlobalLock(h2), xmlUtf8.c_str(), xmlUtf8.size() + 1);
      GlobalUnlock(h2);
      if (SetClipboardData(fmt, h2)) okMime = true;
      else GlobalFree(h2);
    }
  }

  if (okMime && fmt) {
    HANDLE rd = GetClipboardData(fmt);
    if (rd) {
      const char* p = (const char*)GlobalLock(rd);
      if (p) {
        verified = (strcmp(p, xmlUtf8.c_str()) == 0);
        GlobalUnlock(rd);
      }
    }
  }

  CloseClipboard();
  return okMime;
}

static json HandleCopyLmmsClip(const json& payload) {
  std::string xml = payload.value("midiXml", std::string(""));
  if (xml.empty()) return json{{"success", false}, {"error", "Clip rong"}};
  bool verified = false;
  if (!CopyLmmsClipToSystem(xml, verified)) {
    return json{{"success", false}, {"error", "Khong ghi duoc clipboard (dang bi app khac giu?)"}};
  }
  return json{{"success", true}, {"bytes", (long long)xml.size()}, {"verified", verified}};
}

static json HandleLaunchLmms(const json& payload) {
  std::string mmp = payload.value("mmpContent", std::string(""));
  std::string clip = payload.value("trackClipXml", std::string(""));
  std::string customN = payload.value("customPath", std::string(""));
  std::wstring custom = Utf8ToWide(customN);

  auto found = FindLmmsExecutable(custom);
  std::wstring lmmsPath = found.first;

  std::wstring saveDir = GetSafeProjectsDirW();
  std::wstring mmpPath = saveDir + L"\\Random_Song.mmp";
  if (!mmp.empty()) {
    std::string werr;
    if (!WriteFileBytesW(mmpPath, (const uint8_t*)mmp.data(), mmp.size(), werr)) {
      return json{{"success", false}, {"error", "Khong ghi duoc file tam: " + werr}};
    }
  }

  if (IsLmmsRunning()) {
    bool verified = false;
    bool clipOk = false;
    if (!clip.empty()) clipOk = CopyLmmsClipToSystem(clip, verified);
    FocusLmmsAndPaste();
    std::string msg = "Ban LMMS da duoc bat! ";
    if (clipOk) {
      int count = payload.value("trackClipCount", 0);
      msg += "Da chen be Lead (" + std::to_string(count) + " not" + (verified ? ", da kiem tra" : "") + ") - mo piano-roll va Ctrl+V. Full bai nam o file du an ben duoi.";
    } else {
      msg += "Khong chep duoc clip - mo file du an ben duoi de lay full bai.";
    }
    return json{
      {"success", true},
      {"lmmsAlreadyRunning", true},
      {"filePath", WideToUtf8(mmpPath)},
      {"detectedPath", WideToUtf8(lmmsPath)},
      {"message", msg}
    };
  }

  if (lmmsPath.empty()) {
    return json{{"success", false},
      {"error", "Khong tim thay phan mem LMMS tren may tinh! File du an da duoc luu an toan tai: \"" +
        WideToUtf8(mmpPath) + "\". Ban co the chon duong dan file lmms.exe thu cong trong ung dung."}};
  }

  std::wstring cmd = L"\"" + lmmsPath + L"\" \"" + mmpPath + L"\"";
  STARTUPINFOW si{};
  si.cb = sizeof(si);
  PROCESS_INFORMATION pi{};
  std::vector<wchar_t> cmdBuf(cmd.begin(), cmd.end());
  cmdBuf.push_back(0);
  if (!CreateProcessW(nullptr, cmdBuf.data(), nullptr, nullptr, FALSE,
                      DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, nullptr, nullptr, &si, &pi)) {
    return json{{"success", false},
      {"error", "Khong khoi chay duoc LMMS (" + WideToUtf8(lmmsPath) + "), code=" + std::to_string(GetLastError())}};
  }
  CloseHandle(pi.hThread);
  CloseHandle(pi.hProcess);

  return json{
    {"success", true},
    {"lmmsAlreadyRunning", false},
    {"filePath", WideToUtf8(mmpPath)},
    {"detectedPath", WideToUtf8(lmmsPath)},
    {"message", "Da tao file du an va tu dong khoi chay LMMS (" + WideToUtf8(lmmsPath) + ") thanh cong!"}
  };
}

static json HandleGetLmmsPath(const json& payload) {
  std::string customN;
  if (payload.contains("customPath") && payload["customPath"].is_string())
    customN = payload["customPath"].get<std::string>();
  auto found = FindLmmsExecutable(Utf8ToWide(customN));
  if (found.first.empty()) return json{{"path", nullptr}, {"source", found.second}};
  return json{{"path", WideToUtf8(found.first)}, {"source", found.second}};
}

static bool GetRegString(const std::wstring& name, std::wstring& out) {
  HKEY h = nullptr;
  if (RegOpenKeyExW(HKEY_CURRENT_USER, L"Software\\RMG", 0, KEY_READ, &h) != ERROR_SUCCESS) return false;
  wchar_t buf[4096] = {0};
  DWORD cb = sizeof(buf), type = 0;
  LONG rc = RegQueryValueExW(h, name.c_str(), nullptr, &type, (LPBYTE)buf, &cb);
  RegCloseKey(h);
  if (rc != ERROR_SUCCESS || (type != REG_SZ && type != REG_EXPAND_SZ)) return false;
  out = buf;
  while (!out.empty() && out.back() == L'\0') out.pop_back();
  return !out.empty();
}

static bool SetRegString(const std::wstring& name, const std::wstring& val) {
  HKEY h = nullptr;
  if (RegCreateKeyExW(HKEY_CURRENT_USER, L"Software\\RMG", 0, nullptr, 0, KEY_WRITE, nullptr, &h, nullptr) != ERROR_SUCCESS) return false;
  LONG rc = RegSetValueExW(h, name.c_str(), 0, REG_SZ, (const BYTE*)val.c_str(), (DWORD)((val.size() + 1) * sizeof(wchar_t)));
  RegCloseKey(h);
  return rc == ERROR_SUCCESS;
}

static std::wstring GetExportDirW() {
  std::wstring dir;
  if (GetRegString(L"ExportDir", dir) && FileExistsW(dir)) return dir;
  wchar_t doc[MAX_PATH * 4] = {0};
  if (SUCCEEDED(SHGetFolderPathW(nullptr, CSIDL_MYDOCUMENTS, nullptr, 0, doc))) {
    dir = std::wstring(doc) + L"\\RMG";
  } else {
    dir = GetExeDirW() + L"\\exports";
  }
  SHCreateDirectoryExW(nullptr, dir.c_str(), nullptr);
  return dir;
}

static std::wstring GetAutosaveDirW() {
  std::wstring base = GetLocalAppDataW();
  std::wstring dir = base.empty() ? (GetExeDirW() + L"\\autosave") : (base + L"\\RMG\\autosave");
  SHCreateDirectoryExW(nullptr, dir.c_str(), nullptr);
  return dir;
}

static bool ResolveDirectFolder(const std::string& folder, std::wstring& outDir) {
  if (folder == "autosave") { outDir = GetAutosaveDirW(); return true; }
  if (folder == "export") { outDir = GetExportDirW(); return true; }
  if (folder == "soundfonts") {
    std::wstring base = GetLocalAppDataW();
    outDir = base.empty() ? (GetExeDirW() + L"\\soundfonts") : (base + L"\\RMG\\soundfonts");
    SHCreateDirectoryExW(nullptr, outDir.c_str(), nullptr);
    return true;
  }
  return false;
}

static bool SanitizeFileName(const std::wstring& name) {
  if (name.empty() || name.size() > 200) return false;
  if (name.find(L"..") != std::wstring::npos) return false;
  for (wchar_t c : name) {
    if (c == L'/' || c == L'\\' || c == L':' || c < 32) return false;
  }
  return true;
}

static bool ExtractJsonBytes(const json& data, std::string& textOut, std::vector<uint8_t>& binOut, bool& isText) {
  isText = false;
  if (data.is_string()) { isText = true; textOut = data.get<std::string>(); return true; }
  if (data.is_array()) {
    binOut.reserve(data.size());
    for (auto& el : data) binOut.push_back((uint8_t)(el.is_number() ? (el.get<int>() & 0xFF) : 0));
    return true;
  }
  if (data.is_object()) {
    std::vector<std::pair<long long, int>> kv;
    for (auto it = data.begin(); it != data.end(); ++it) {
      try {
        long long k = std::stoll(it.key());
        kv.push_back({k, it->is_number() ? (it->get<int>() & 0xFF) : 0});
      } catch (...) {}
    }
    std::sort(kv.begin(), kv.end());
    for (auto& p : kv) binOut.push_back((uint8_t)p.second);
    return true;
  }
  return false;
}

static json HandleSaveFileDirect(const json& payload) {
  std::string folder = payload.value("folder", std::string("export"));
  std::string fileNameN = payload.value("fileName", std::string(""));
  std::wstring dir;
  if (!ResolveDirectFolder(folder, dir)) return json{{"success", false}, {"error", "Unknown folder"}};
  std::wstring wName = Utf8ToWide(fileNameN);
  if (!SanitizeFileName(wName)) return json{{"success", false}, {"error", "Ten file khong hop le"}};
  std::wstring outPath = dir + L"\\" + wName;
  if (!payload.contains("data")) return json{{"success", false}, {"error", "Thieu du lieu"}};
  std::string text; std::vector<uint8_t> bin; bool isText = false;
  if (!ExtractJsonBytes(payload["data"], text, bin, isText)) {
    return json{{"success", false}, {"error", "Du lieu khong hop le"}};
  }
  if (payload.contains("chunkIndex") && payload.contains("totalChunks")) {
    int idx = payload.value("chunkIndex", 0);
    int total = payload.value("totalChunks", 1);
    if (idx < 0 || total <= 1 || idx >= total) {
      return json{{"success", false}, {"error", "Chunk khong hop le"}};
    }
    HANDLE h = (idx == 0)
      ? CreateFileW(outPath.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr)
      : CreateFileW(outPath.c_str(), FILE_APPEND_DATA, 0, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (h == INVALID_HANDLE_VALUE) {
      return json{{"success", false}, {"error", "Khong mo duoc file de ghi chunk"}};
    }
    const uint8_t* ptr = isText ? (const uint8_t*)text.data() : bin.data();
    size_t left = isText ? text.size() : bin.size();
    size_t done = 0;
    bool fail = false;
    while (done < left) {
      size_t want = left - done > 1048576 ? 1048576 : left - done;
      DWORD wrote = 0;
      if (!WriteFile(h, ptr + done, (DWORD)want, &wrote, nullptr) || wrote == 0) { fail = true; break; }
      done += wrote;
    }
    CloseHandle(h);
    if (fail) return json{{"success", false}, {"error", "Ghi chunk that bai"}};
    return json{{"success", true}, {"done", idx == total - 1}, {"filePath", WideToUtf8(outPath)}};
  }
  std::string werr;
  bool ok = isText
    ? WriteFileBytesW(outPath, (const uint8_t*)text.data(), text.size(), werr)
    : WriteFileBytesW(outPath, bin.data(), bin.size(), werr);
  if (!ok) return json{{"success", false}, {"error", werr}};
  return json{{"success", true}, {"filePath", WideToUtf8(outPath)}};
}

static json HandleListFiles(const json& payload) {
  std::string folder = payload.value("folder", std::string("export"));
  std::wstring dir;
  if (!ResolveDirectFolder(folder, dir)) return json{{"success", false}, {"error", "Unknown folder"}};
  json arr = json::array();
  WIN32_FIND_DATAW fd{};
  HANDLE h = FindFirstFileW((dir + L"\\*").c_str(), &fd);
  if (h != INVALID_HANDLE_VALUE) {
    do {
      if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) continue;
      ULARGE_INTEGER sz{};
      sz.HighPart = fd.nFileSizeHigh;
      sz.LowPart = fd.nFileSizeLow;
      ULARGE_INTEGER ft{};
      ft.HighPart = fd.ftLastWriteTime.dwHighDateTime;
      ft.LowPart = fd.ftLastWriteTime.dwLowDateTime;
      long long ms = 0;
      if (ft.QuadPart > 116444736000000000ULL) ms = (long long)((ft.QuadPart - 116444736000000000ULL) / 10000ULL);
      arr.push_back({ {"name", WideToUtf8(fd.cFileName)}, {"size", (long long)sz.QuadPart}, {"mtime", ms} });
    } while (FindNextFileW(h, &fd));
    FindClose(h);
  }
  std::sort(arr.begin(), arr.end(), [](const json& a, const json& b) {
    return a.value("mtime", 0LL) > b.value("mtime", 0LL);
  });
  return json{{"success", true}, {"dir", WideToUtf8(dir)}, {"files", arr}};
}

static json HandleReadFileDirect(const json& payload) {
  std::string folder = payload.value("folder", std::string("autosave"));
  std::string fileNameN = payload.value("fileName", std::string(""));
  std::wstring dir;
  if (!ResolveDirectFolder(folder, dir)) return json{{"success", false}, {"error", "Unknown folder"}};
  std::wstring wName = Utf8ToWide(fileNameN);
  if (!SanitizeFileName(wName)) return json{{"success", false}, {"error", "Ten file khong hop le"}};
  HANDLE h = CreateFileW((dir + L"\\" + wName).c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (h == INVALID_HANDLE_VALUE) return json{{"success", false}, {"error", "Khong doc duoc file"}};
  std::vector<uint8_t> data;
  LARGE_INTEGER sz{};
  if (GetFileSizeEx(h, &sz) && sz.QuadPart > 0 && sz.QuadPart < 64 * 1024 * 1024) {
    data.resize((size_t)sz.QuadPart);
    size_t done = 0;
    while (done < data.size()) {
      size_t left = data.size() - done;
      DWORD want = (DWORD)(left > 1048576 ? 1048576 : left);
      DWORD chunk = 0;
      if (!ReadFile(h, data.data() + done, want, &chunk, nullptr) || chunk == 0) break;
      done += chunk;
    }
    data.resize(done);
  }
  CloseHandle(h);
  json arr = json::array();
  for (uint8_t b : data) arr.push_back(b);
  return json{{"success", true}, {"data", arr}};
}

static json HandleDeleteFile(const json& payload) {
  std::string folder = payload.value("folder", std::string("autosave"));
  std::string fileNameN = payload.value("fileName", std::string(""));
  std::wstring dir;
  if (!ResolveDirectFolder(folder, dir)) return json{{"success", false}, {"error", "Unknown folder"}};
  std::wstring wName = Utf8ToWide(fileNameN);
  if (!SanitizeFileName(wName)) return json{{"success", false}, {"error", "Ten file khong hop le"}};
  if (!DeleteFileW((dir + L"\\" + wName).c_str())) {
    return json{{"success", false}, {"error", "Khong xoa duoc file"}};
  }
  return json{{"success", true}};
}

static json HandleGetExportDir(const json& payload) {
  (void)payload;
  return json{{"success", true}, {"dir", WideToUtf8(GetExportDirW())}};
}

static int CALLBACK BrowseCb(HWND hwnd, UINT msg, LPARAM, LPARAM lpData) {
  if (msg == BFFM_INITIALIZED && lpData) {
    SendMessageW(hwnd, BFFM_SETSELECTIONW, TRUE, lpData);
  }
  return 0;
}

static json HandleSetExportDir(const json& payload) {
  (void)payload;
  std::wstring cur = GetExportDirW();
  BROWSEINFOW bi{};
  bi.hwndOwner = g_hwnd;
  bi.lpszTitle = L"Chon thu muc xuat file mac dinh cho RinTune";
  bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE;
  bi.lpfn = BrowseCb;
  bi.lParam = (LPARAM)cur.c_str();
  PIDLIST_ABSOLUTE pidl = SHBrowseForFolderW(&bi);
  if (!pidl) return json{{"success", false}, {"cancelled", true}};
  wchar_t buf[MAX_PATH * 4] = {0};
  BOOL ok = SHGetPathFromIDListW(pidl, buf);
  CoTaskMemFree(pidl);
  if (!ok || !buf[0]) return json{{"success", false}, {"cancelled", true}};
  std::wstring sel = buf;
  SHCreateDirectoryExW(nullptr, sel.c_str(), nullptr);
  SetRegString(L"ExportDir", sel);
  return json{{"success", true}, {"dir", WideToUtf8(sel)}};
}

static json HandleQuitApp(const json& payload) {
  (void)payload;
  PostQuitMessage(0);
  return json{{"success", true}};
}

static json HandleOpenFolder(const json& payload) {  std::string folder = payload.value("folder", std::string("export"));
  std::wstring dir;
  if (!ResolveDirectFolder(folder, dir)) return json{{"success", false}, {"error", "Unknown folder"}};
  HINSTANCE r = ShellExecuteW(g_hwnd, L"open", dir.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
  if ((INT_PTR)r <= 32) return json{{"success", false}, {"error", "Khong mo duoc thu muc"}};
  return json{{"success", true}, {"dir", WideToUtf8(dir)}};
}

static json HandleOpenFile(const json& payload) {
  (void)payload;
  std::vector<wchar_t> fileBuf(32768, 0);
  OPENFILENAMEW ofn{};
  ofn.lStructSize = sizeof(ofn);
  ofn.hwndOwner = g_hwnd;
  ofn.lpstrFilter = L"RinTune Project (*.rmg)\0*.rmg\0Standard MIDI Files (*.mid;*.midi)\0*.mid;*.midi\0All Files (*.*)\0*.*\0";
  ofn.nFilterIndex = 1;
  ofn.lpstrFile = fileBuf.data();
  ofn.nMaxFile = (DWORD)fileBuf.size();
  ofn.lpstrTitle = L"Chon file MIDI de mo trong RinTune";
  ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR;
  if (!GetOpenFileNameW(&ofn)) {
    if (CommDlgExtendedError() == 0) return json{{"success", false}, {"cancelled", true}};
    return json{{"success", false}, {"error", "Open dialog failed"}};
  }
  std::wstring sel = fileBuf.data();
  HANDLE h = CreateFileW(sel.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (h == INVALID_HANDLE_VALUE) {
    return json{{"success", false}, {"error", "Khong doc duoc file, code=" + std::to_string(GetLastError())}};
  }
  std::vector<uint8_t> data;
  LARGE_INTEGER sz{};
  if (GetFileSizeEx(h, &sz) && sz.QuadPart > 0 && sz.QuadPart < 64 * 1024 * 1024) {
    data.resize((size_t)sz.QuadPart);
    size_t done = 0;
    while (done < data.size()) {
      size_t left = data.size() - done;
      DWORD want = (DWORD)(left > 1048576 ? 1048576 : left);
      DWORD chunk = 0;
      if (!ReadFile(h, data.data() + done, want, &chunk, nullptr) || chunk == 0) break;
      done += chunk;
    }
    data.resize(done);
  }
  CloseHandle(h);
  json arr = json::array();
  for (uint8_t b : data) arr.push_back(b);
  return json{{"success", true}, {"filePath", WideToUtf8(sel)}, {"data", arr}};
}

static json HandleSelectLmmsPath() {
  std::vector<wchar_t> fileBuf(32768, 0);
  OPENFILENAMEW ofn{};
  ofn.lStructSize = sizeof(ofn);
  ofn.hwndOwner = g_hwnd;
  ofn.lpstrFilter = L"LMMS Executable (lmms.exe)\0lmms.exe\0All Files (*.*)\0*.*\0";
  ofn.nFilterIndex = 1;
  ofn.lpstrFile = fileBuf.data();
  ofn.nMaxFile = (DWORD)fileBuf.size();
  ofn.lpstrTitle = L"Chon duong dan file lmms.exe tren may tinh cua ban";
  ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR;
  if (!GetOpenFileNameW(&ofn)) {
    if (CommDlgExtendedError() == 0) return json{{"success", false}, {"cancelled", true}};
    return json{{"success", false}, {"error", "Open dialog failed"}};
  }
  std::wstring sel = fileBuf.data();
  if (EndsWithW(sel, L"lmms.exe") && FileExistsW(sel)) {
    return json{{"success", true}, {"filePath", WideToUtf8(sel)}};
  }
  return json{{"success", false}, {"error", "Tep da chon khong phai la lmms.exe hop le."}};
}

static void OnWebMessage(const std::wstring& msgJsonW) {
  try {
    std::string msgJson = WideToUtf8(msgJsonW);
    json msg = json::parse(msgJson);
    if (!msg.is_object()) return;
    std::string id = msg.value("id", std::string(""));
    std::string method = msg.value("method", std::string(""));
    json payload = msg.contains("payload") ? msg["payload"] : json::object();
    if (id.empty() || method.empty()) return;

    json res;
    try {
      if (method == "saveFile") res = HandleSaveFile(payload);
      else if (method == "launchLMMS") res = HandleLaunchLmms(payload);
      else if (method == "getLmmsPath") res = HandleGetLmmsPath(payload);
      else if (method == "selectLmmsPath") res = HandleSelectLmmsPath();
    else if (method == "openFile") res = HandleOpenFile(payload);
    else if (method == "saveFileDirect") res = HandleSaveFileDirect(payload);
    else if (method == "listFiles") res = HandleListFiles(payload);
    else if (method == "readFileDirect") res = HandleReadFileDirect(payload);
    else if (method == "deleteFile") res = HandleDeleteFile(payload);
    else if (method == "getExportDir") res = HandleGetExportDir(payload);
    else if (method == "setExportDir") res = HandleSetExportDir(payload);
    else if (method == "openFolder") res = HandleOpenFolder(payload);
    else if (method == "quitApp") res = HandleQuitApp(payload);
    else if (method == "copyLmmsClip") res = HandleCopyLmmsClip(payload);
      else res = json{{"success", false}, {"error", "Unknown method: " + method}};
    } catch (const std::exception& e) {
      res = json{{"success", false}, {"error", e.what()}};
    } catch (...) {
      res = json{{"success", false}, {"error", "Unknown native error"}};
    }
    ReplyWeb(id, res);
  } catch (...) {}
}


static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  switch (msg) {
    case WM_GETMINMAXINFO: {
      MINMAXINFO* m = (MINMAXINFO*)lp;
      m->ptMinTrackSize.x = 800;
      m->ptMinTrackSize.y = 650;
      return 0;
    }
    case WM_SIZE:
      if (g_controller) {
        RECT r;
        GetClientRect(hwnd, &r);
        g_controller->put_Bounds(r);
      }
      return 0;
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProcW(hwnd, msg, wp, lp);
}

static void InitWebView2(HWND hwnd) {
  std::wstring dataDir = GetLocalAppDataW();
  dataDir = dataDir.empty() ? GetExeDirW() + L"\\webview2-data" : dataDir + L"\\RMG\\webview2-data";
  SHCreateDirectoryExW(nullptr, dataDir.c_str(), nullptr);

  std::wstring indexHtml = FindIndexHtml();
  std::wstring url = ToFileUrl(indexHtml);

  HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(
    nullptr, dataDir.c_str(), nullptr,
    Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
      [hwnd, url](HRESULT res, ICoreWebView2Environment* env) -> HRESULT {
        if (FAILED(res) || !env) {
          MessageBoxW(hwnd, L"Khong khoi tao duoc WebView2. Hay cai Microsoft Edge WebView2 Runtime.",
                       L"RinTune - Loi", MB_ICONERROR);
          return res;
        }
        env->CreateCoreWebView2Controller(
          hwnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
            [hwnd, url](HRESULT res2, ICoreWebView2Controller* ctrl) -> HRESULT {
              if (FAILED(res2) || !ctrl) {
                MessageBoxW(hwnd, L"Khong tao duoc WebView2 Controller.", L"RinTune - Loi", MB_ICONERROR);
                return res2;
              }
              g_controller = ctrl;
              ComPtr<ICoreWebView2> wv;
              ctrl->get_CoreWebView2(&wv);
              g_webview = wv;

              ComPtr<ICoreWebView2Settings> settings;
              if (SUCCEEDED(wv->get_Settings(&settings))) {
                settings->put_AreDefaultContextMenusEnabled(TRUE);
                settings->put_IsScriptEnabled(TRUE);
              }

              wv->AddScriptToExecuteOnDocumentCreated(kBridgeShim, nullptr);

              wv->add_WebMessageReceived(
                Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                  [](ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                    LPWSTR raw = nullptr;
                    if (SUCCEEDED(args->get_WebMessageAsJson(&raw)) && raw) {
                      std::wstring s = raw;
                      CoTaskMemFree(raw);
                      OnWebMessage(s);
                    }
                    return S_OK;
                  }).Get(),
                nullptr);

              RECT r;
              GetClientRect(hwnd, &r);
              ctrl->put_Bounds(r);
              wv->Navigate(url.c_str());
              return S_OK;
            }).Get());
        return S_OK;
      }).Get());

  if (FAILED(hr)) {
    MessageBoxW(hwnd, L"Khong tim thay WebView2 Runtime.", L"RinTune - Loi", MB_ICONERROR);
  }
}

int WINAPI wWinMain(HINSTANCE hInst, HINSTANCE, PWSTR, int nCmd) {
  SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
  CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  const wchar_t* kClass = L"RMG_NATIVE_HOST";
  WNDCLASSW wc{};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = hInst;
  wc.lpszClassName = kClass;
  wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
  wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
  wc.hIcon = LoadIconW(hInst, MAKEINTRESOURCEW(101));
  if (!wc.hIcon) wc.hIcon = LoadIconW(nullptr, IDI_APPLICATION);
  RegisterClassW(&wc);

  g_hwnd = CreateWindowExW(
    0, kClass, L"RinTune Studio (by Rin0suke257)",
    WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN,
    CW_USEDEFAULT, CW_USEDEFAULT, 1040, 900,
    nullptr, nullptr, hInst, nullptr);
  if (!g_hwnd) return 1;

  ShowWindow(g_hwnd, nCmd);
  UpdateWindow(g_hwnd);

  InitWebView2(g_hwnd);

  MSG m;
  while (GetMessageW(&m, nullptr, 0, 0)) {
    TranslateMessage(&m);
    DispatchMessageW(&m);
  }

  g_webview.Reset();
  g_controller.Reset();
  CoUninitialize();
  return 0;
}
