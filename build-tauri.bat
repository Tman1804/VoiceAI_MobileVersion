@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\VC\Auxiliary\Build\vcvars64.bat"
set INCLUDE=%INCLUDE%;C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\VC\Tools\MSVC\14.26.28801\include
set LIB=%LIB%;C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\VC\Tools\MSVC\14.26.28801\lib\x64
set PATH=%PATH%;C:\Users\tessmann\.cargo\bin
cd /d "C:\Users\tessmann\source\repos\voice-note-ai"
npm run tauri:build
