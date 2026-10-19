@echo off
rem MSVC check for the Road to Shipping v23 pages.
rem Run it from any PowerShell or cmd window: it loads vcvars64 itself if needed.
rem It compiles each tiny file in cases\ and writes every message to results.txt.
setlocal
cd /d "%~dp0"
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if "%VSCMD_ARG_TGT_ARCH%"=="" if exist "%VSWHERE%" for /f "usebackq delims=" %%i in (`"%VSWHERE%" -latest -products * -property installationPath`) do set "VSDIR=%%i"
if "%VSCMD_ARG_TGT_ARCH%"=="" if defined VSDIR call "%VSDIR%\VC\Auxiliary\Build\vcvars64.bat" >nul
cd /d "%~dp0"
if "%VSCMD_ARG_TGT_ARCH%"=="" (
  echo Could not find the x64 compiler. Open the x64 Developer Command Prompt, then run this again.
  exit /b 1
)
set "OUT=%~dp0results.txt"
set "TMPO=%TEMP%\rts-msvc-check"
if not exist "%TMPO%" mkdir "%TMPO%"
echo target=%VSCMD_ARG_TGT_ARCH%> "%OUT%"
cl 2>&1 | findstr /i "Version" >> "%OUT%"
for %%f in (cases\*.c) do (
  echo ==== %%~nf>> "%OUT%"
  if "%%~nf"=="p5_crt_define_twice" (
    cl /nologo /W4 /WX /std:c17 /D_CRT_SECURE_NO_WARNINGS /c "%%f" /Fo"%TMPO%\%%~nf.obj" >> "%OUT%" 2>&1
  ) else (
    cl /nologo /W4 /WX /std:c17 /c "%%f" /Fo"%TMPO%\%%~nf.obj" >> "%OUT%" 2>&1
  )
)
echo ==== facts>> "%OUT%"
cl /nologo /W4 /WX /std:c17 facts.c /Fo"%TMPO%\facts.obj" /Fe"%TMPO%\facts.exe" >> "%OUT%" 2>&1 && "%TMPO%\facts.exe" >> "%OUT%"
echo.
echo Done. Results are in results.txt next to this file.
