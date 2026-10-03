@echo off
setlocal
cd /d "%~dp0mcp"
if errorlevel 1 goto no_dir

set FAIL=0
for %%T in (test-mcp test-export test-mix test-midi test-motif test-patterns test-engine-suite test-arrange test-bass test-texture test-cohesion test-custom test-lyric test-bugs test-stab) do (
  call :runtest %%T
)
if "%FAIL%"=="0" (
  echo.
  echo [OK] Tat ca test pass
  exit /b 0
) else (
  echo.
  echo [FAIL] Co %FAIL% test loi
  exit /b 1
)

:runtest
echo --- %1 ---
call node %1.js
if errorlevel 1 set /a FAIL+=1
goto :eof

:no_dir
echo [ERROR] Khong vao duoc thu muc mcp
exit /b 1
