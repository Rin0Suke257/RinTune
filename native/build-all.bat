@echo off
setlocal
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

echo ===== [1/3] RinTune.exe =====
call "%ROOT%\build.bat"
if errorlevel 1 goto build_fail

if /i "%1"=="mcp" (
  echo ===== [2/3] RinTune-MCP.exe =====
  call "%ROOT%\build-mcp.bat"
  if errorlevel 1 goto build_fail
) else (
  echo ===== [2/3] MCP bo qua (them doi so mcp de build) =====
)

echo ===== [3/3] Setup =====
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "%ROOT%\installer\RinTune.iss"
if errorlevel 1 goto build_fail

echo.
echo [OK] Build full xong: %ROOT%\out
endlocal
exit /b 0

:build_fail
echo [ERROR] Build that bai
exit /b 1
