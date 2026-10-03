@echo off
REM Build MCP-RMG.exe - single file, may khac khong can Node
REM Yeu cau: Node 20+ co san trong PATH, co mang de npx postject
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

echo [5/5] inject vao MCP-RMG.exe...
copy /y "%SystemDrive%\Program Files\nodejs\node.exe" dist\MCP-RMG.exe >nul
if errorlevel 1 goto no_node
call npx -y postject dist/MCP-RMG.exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if errorlevel 1 goto build_fail
copy /y dist\MCP-RMG.exe "%ROOT%\out\MCP-RMG.exe" >nul

echo.
echo [OK] %ROOT%\out\MCP-RMG.exe
dir "%ROOT%\out\MCP-RMG.exe"
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
