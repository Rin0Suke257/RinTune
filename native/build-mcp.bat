@echo off
setlocal
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
cd /d "%ROOT%\mcp"
if errorlevel 1 goto no_dir

echo [1/5] npm install...
call npm install
if errorlevel 1 goto build_fail

echo [2/5] test server...
call node test-mcp.js
if errorlevel 1 goto build_fail

echo [3/5] bundle esbuild...
call npx esbuild server.js --bundle --platform=node --format=cjs --outfile=dist/mcp-rmg.cjs --log-level=warning
if errorlevel 1 goto build_fail

echo [4/5] Node SEA blob...
call node --experimental-sea-config sea-config.json
if errorlevel 1 goto build_fail

echo [5/5] inject vao RinTune-MCP.exe...
copy /y "%SystemDrive%\Program Files\nodejs\node.exe" dist\RinTune-MCP.exe >nul
if errorlevel 1 goto no_node
call npx -y postject dist/RinTune-MCP.exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if errorlevel 1 goto build_fail
copy /y dist\RinTune-MCP.exe "%ROOT%\out\RinTune-MCP.exe" >nul

echo.
echo [OK] %ROOT%\out\RinTune-MCP.exe
dir "%ROOT%\out\RinTune-MCP.exe"
endlocal
exit /b 0

:no_dir
echo [ERROR] Khong vao duoc thu muc mcp
exit /b 1

:no_node
echo [ERROR] Khong tim thay node.exe trong Program Files nodejs
exit /b 1

:build_fail
echo [ERROR] Build MCP that bai
exit /b 1
