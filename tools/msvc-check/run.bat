@echo off
rem MSVC check for the Road to Shipping v23 pages.
rem Run from the x64 Developer Command Prompt (or a terminal after vcvars64.bat).
rem It compiles each tiny file in cases\ and writes every message to results.txt.
setlocal
cd /d "%~dp0"
if "%VSCMD_ARG_TGT_ARCH%"=="" (
  echo Open the x64 Developer Command Prompt first, then run this again.
  exit /b 1
)
set OUT=%~dp0results.txt
set TMPO=%TEMP%\rts-msvc-check\
if not exist "%TMPO%" mkdir "%TMPO%"
echo target=%VSCMD_ARG_TGT_ARCH% > "%OUT%"
cl 2>&1 | findstr /i "Version" >> "%OUT%"
for %%f in (cases\*.c) do (
  echo ==== %%~nf>> "%OUT%"
  if "%%~nf"=="p5_crt_define_twice" (
    cl /nologo /W4 /WX /std:c17 /D_CRT_SECURE_NO_WARNINGS /c /Fo"%TMPO%" "%%f" >> "%OUT%" 2>&1
  ) else (
    cl /nologo /W4 /WX /std:c17 /c /Fo"%TMPO%" "%%f" >> "%OUT%" 2>&1
  )
)
echo ==== facts>> "%OUT%"
cl /nologo /W4 /WX /std:c17 facts.c /Fo"%TMPO%" /Fe:"%TMPO%facts.exe" >> "%OUT%" 2>&1 && "%TMPO%facts.exe" >> "%OUT%"
echo.
echo Done. Results are in results.txt next to this file.
