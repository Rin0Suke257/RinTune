@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
if errorlevel 1 goto no_vs

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
set OBJ=%ROOT%\obj
set OUT=%ROOT%\out\RinTune
set WV=%ROOT%\packages\Microsoft.Web.WebView2
if not exist "%WV%\build\native\include\WebView2.h" goto no_sdk
mkdir "%OBJ%" 2>nul
mkdir "%OUT%" 2>nul

echo [1/4] Resource...
pushd "%ROOT%"
rc /nologo /i res /fo "%OBJ%\RinTune.res" res\RinTune.rc
if errorlevel 1 goto rc_fail
popd

echo [2/4] Compile...
cl /nologo /std:c++17 /EHsc /O2 /W3 /DUNICODE /D_UNICODE /I "%WV%\build\native\include" /c "%ROOT%\src\main.cpp" /Fo"%OBJ%\main.obj"
if errorlevel 1 goto build_fail

echo [3/4] Link...
link /nologo "%OBJ%\main.obj" "%OBJ%\RinTune.res" "%WV%\build\native\x64\WebView2LoaderStatic.lib" shlwapi.lib ole32.lib shell32.lib user32.lib gdi32.lib comdlg32.lib advapi32.lib /OUT:"%OUT%\RinTune.exe" /SUBSYSTEM:WINDOWS /MACHINE:X64
if errorlevel 1 goto build_fail

echo [4/4] Copy UI...
copy /y "%ROOT%\..\index.html" "%OUT%\" >nul
copy /y "%ROOT%\..\index.css" "%OUT%\" >nul
copy /y "%ROOT%\..\renderer.js" "%OUT%\" >nul
mkdir "%OUT%\engine" 2>nul
copy /y "%ROOT%\..\engine\*.js" "%OUT%\engine\" >nul
mkdir "%OUT%\assets\Icon" 2>nul
copy /y "%ROOT%\..\assets\Icon\*.png" "%OUT%\assets\Icon\" >nul
copy /y "%ROOT%\..\assets\Icon\*.ico" "%OUT%\assets\Icon\" >nul

echo.
echo [OK] %OUT%\RinTune.exe
dir "%OUT%\RinTune.exe"
endlocal
exit /b 0

:no_vs
echo [ERROR] Khong tim thay Visual Studio C++ vcvars64.bat
exit /b 1

:no_sdk
echo [ERROR] Thieu WebView2 SDK
exit /b 1

:rc_fail
popd
echo [ERROR] Bien dich resource that bai
exit /b 1

:build_fail
echo [ERROR] Bien dich that bai
exit /b 1
