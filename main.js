const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.setPath('userData', path.join(app.getPath('temp'), 'RMG-App-Cache'));

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'Icon', 'rmg_icon.png');

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 900,
    minWidth: 800,
    minHeight: 650,
    title: 'RinTune Studio (by Rin0suke257)',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#090a10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

function isLmmsRunning() {
  try {
    const stdout = execSync('tasklist.exe /FI "IMAGENAME eq lmms.exe" /NH', { encoding: 'utf8', windowsHide: true });
    return stdout.toLowerCase().includes('lmms.exe');
  } catch (err) {
    return false;
  }
}

function focusLmmsAndPaste() {
  try {
    const psScript = `$wsh = New-Object -ComObject WScript.Shell; if ($wsh.AppActivate('LMMS')) { Start-Sleep -Milliseconds 250; $wsh.SendKeys('^v') }; exit`;
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', psScript], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  } catch (err) {
    console.error('Focus LMMS error:', err);
  }
}

function getSafeProjectsDir() {
  const projDir = path.join(app.getPath('userData'), 'projects');
  try {
    if (!fs.existsSync(projDir)) {
      fs.mkdirSync(projDir, { recursive: true });
    }
    return projDir;
  } catch (e) {
    return app.getPath('temp');
  }
}

function queryRegistry(regPath, valueName = '') {
  try {
    const valParam = valueName ? `/v "${valueName}"` : '/ve';
    const stdout = execSync(`reg query "${regPath}" ${valParam} 2>nul`, { encoding: 'utf8', windowsHide: true });
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('REG_SZ') || line.includes('REG_EXPAND_SZ')) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 3) {
          const val = parts[2].trim().replace(/^"|"$/g, '');
          if (fs.existsSync(val)) return val;
        }
      }
    }
  } catch (e) {}
  return null;
}

function findLmmsExecutable(customPath = null) {
  if (customPath && typeof customPath === 'string' && customPath.trim().length > 0) {
    const trimmed = customPath.trim();
    if (fs.existsSync(trimmed)) {
      return { path: trimmed, source: 'custom' };
    }
  }

  const regCandidates = [
    { key: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\lmms.exe' },
    { key: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\lmms.exe' },
    { key: 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\lmms.exe' }
  ];
  for (const reg of regCandidates) {
    const found = queryRegistry(reg.key);
    if (found) return { path: found, source: 'registry' };
  }

  try {
    const stdout = execSync('where.exe lmms.exe 2>nul', { encoding: 'utf8', windowsHide: true });
    const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (fs.existsSync(line)) {
        return { path: line, source: 'path' };
      }
    }
  } catch (e) {}

  const candidatePaths = [
    'C:\\Program Files\\LMMS\\lmms.exe',
    'D:\\LMMS\\lmms.exe',
    'C:\\Program Files (x86)\\LMMS\\lmms.exe',
    'E:\\LMMS\\lmms.exe',
    'F:\\LMMS\\lmms.exe',
    'C:\\LMMS\\lmms.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'LMMS', 'lmms.exe'),
    path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'lmms', 'current', 'lmms.exe'),
    path.join(process.env.ChocolateyInstall || 'C:\\ProgramData\\chocolatey', 'bin', 'lmms.exe')
  ];

  for (const cand of candidatePaths) {
    try {
      if (cand && fs.existsSync(cand)) {
        return { path: cand, source: 'system' };
      }
    } catch (e) {}
  }

  return { path: null, source: 'none' };
}

ipcMain.handle('get-lmms-path', async (event, customPath) => {
  return findLmmsExecutable(customPath);
});

ipcMain.handle('select-lmms-path', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn đường dẫn file lmms.exe trên máy tính của bạn',
      filters: [{ name: 'LMMS Executable (lmms.exe)', extensions: ['exe'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const selectedPath = filePaths[0];
    if (selectedPath.toLowerCase().endsWith('lmms.exe') && fs.existsSync(selectedPath)) {
      return { success: true, filePath: selectedPath };
    } else {
      return { success: false, error: 'Tệp đã chọn không phải là lmms.exe hợp lệ.' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launch-lmms', async (event, payload) => {
  try {
    let mmpContent = '';
    let trackClipXml = '';
    let customPath = null;

    if (typeof payload === 'string') {
      mmpContent = payload;
    } else if (payload && typeof payload === 'object') {
      mmpContent = payload.mmpContent || '';
      trackClipXml = payload.trackClipXml || '';
      customPath = payload.customPath || null;
    }

    const lmmsResult = findLmmsExecutable(customPath);
    const lmmsExePath = lmmsResult.path;
    const saveDir = getSafeProjectsDir();
    const mmpFilePath = path.join(saveDir, 'Random_Song.mmp');

    if (mmpContent) {
      fs.writeFileSync(mmpFilePath, mmpContent, 'utf-8');
    }

    const running = isLmmsRunning();

    if (running) {
      if (trackClipXml) {
        clipboard.writeText(trackClipXml);
      }
      focusLmmsAndPaste();

      return {
        success: true,
        lmmsAlreadyRunning: true,
        filePath: mmpFilePath,
        detectedPath: lmmsExePath,
        message: 'Bản LMMS đã được bật! Đã tự động chèn Track & Giai điệu mới vào phiên LMMS đang chạy!'
      };
    } else {
      if (!lmmsExePath) {
        return {
          success: false,
          error: `Không tìm thấy phần mềm LMMS trên máy tính! File dự án đã được lưu an toàn tại: "${mmpFilePath}". Bạn có thể chọn đường dẫn file lmms.exe thủ công trong ứng dụng.`
        };
      }

      const child = spawn(lmmsExePath, [mmpFilePath], {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      return {
        success: true,
        lmmsAlreadyRunning: false,
        filePath: mmpFilePath,
        detectedPath: lmmsExePath,
        message: `Đã tạo file dự án và tự động khởi chạy LMMS (${lmmsExePath}) thành công!`
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Lỗi không xác định khi tương tác với LMMS.'
    };
  }
});

ipcMain.handle('save-file', async (event, payload) => {
  try {
    let { data, defaultName, type } = payload || {};

    const isMidi = type === 'midi' || (defaultName && defaultName.toLowerCase().endsWith('.mid'));
    const filters = isMidi
      ? [{ name: 'MIDI Files (*.mid)', extensions: ['mid'] }]
      : [{ name: 'LMMS Project Files (*.mmp)', extensions: ['mmp'] }];

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || (isMidi ? 'RinTune_Melody.mid' : 'RinTune_Song.mmp'),
      filters: filters
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    if (typeof data === 'string') {
      fs.writeFileSync(filePath, data, 'utf-8');
    } else if (Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data);
    } else if (data instanceof Uint8Array || Array.isArray(data)) {
      fs.writeFileSync(filePath, Buffer.from(data));
    } else if (data && data.buffer) {
      const buf = Buffer.from(data.buffer, data.byteOffset || 0, data.byteLength || data.buffer.byteLength);
      fs.writeFileSync(filePath, buf);
    } else if (typeof data === 'object' && data !== null) {
      const values = Object.values(data);
      fs.writeFileSync(filePath, Buffer.from(values));
    } else {
      fs.writeFileSync(filePath, String(data), 'utf-8');
    }

    return { success: true, filePath };
  } catch (err) {
    console.error('Save file error:', err);
    return { success: false, error: err.message };
  }
});
