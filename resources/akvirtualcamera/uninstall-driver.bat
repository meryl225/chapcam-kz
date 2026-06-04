@echo off
REM ============================================================
REM Desinstallation du pilote camera virtuelle "ChapCam Camera"
REM akvirtualcamera v9.x. Appele par le hook NSIS customUnInstall.
REM ============================================================
setlocal
set DRV=%~1
if "%DRV%"=="" set DRV=%~dp0
set BIN=%DRV%\x64

echo [ChapCam] Suppression du peripherique "ChapCam Camera"...

REM 1) Supprimer le peripherique
if exist "%BIN%\AkVCamManager.exe" (
  "%BIN%\AkVCamManager.exe" remove-device ChapCamCamera
  "%BIN%\AkVCamManager.exe" update
)

REM 2) Desenregistrer les filtres DirectShow + Media Foundation
if exist "%BIN%\AkVirtualCamera.dll" (
  regsvr32 /s /u "%BIN%\AkVirtualCamera.dll"
)
if exist "%BIN%\AkVirtualCameraMF.dll" (
  regsvr32 /s /u "%BIN%\AkVirtualCameraMF.dll"
)

echo [ChapCam] Pilote ChapCam Camera supprime.
endlocal
exit /b 0
