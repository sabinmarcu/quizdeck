@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  >&2 echo Quizdeck requires Node.js on PATH.
  exit /b 1
)
node "%~dp0quizdeck.js" %*
exit /b %ERRORLEVEL%
