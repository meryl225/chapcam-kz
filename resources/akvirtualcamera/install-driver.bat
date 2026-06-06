@echo off
REM ============================================================
REM Installation du pilote camera virtuelle "ChapCam Camera"
REM akvirtualcamera v9.x : DirectShow (AkVirtualCamera.dll) +
REM Media Foundation (AkVirtualCameraMF.dll)
REM
REM Usage : install-driver.bat "<dossier_du_pilote>"
REM Appele par le hook NSIS customInstall (en administrateur).
REM Le dossier doit contenir x64\AkVCamManager.exe + les .dll.
REM ============================================================
setlocal
set DRV=%~1
if "%DRV%"=="" set DRV=%~dp0
set BIN=%DRV%\x64

echo [ChapCam] Dossier pilote : %BIN%

REM 1) Enregistrer le filtre DirectShow -> OBS, Zoom, Discord, Chrome/Meet, Edge
if exist "%BIN%\AkVirtualCamera.dll" (
  regsvr32 /s "%BIN%\AkVirtualCamera.dll"
  echo [ChapCam] DirectShow enregistre
)

REM 2) Enregistrer le pont Media Foundation -> Microsoft Teams, app Camera Windows
if exist "%BIN%\AkVirtualCameraMF.dll" (
  regsvr32 /s "%BIN%\AkVirtualCameraMF.dll"
  echo [ChapCam] Media Foundation enregistre
)

REM 3) Creer le peripherique visible "ChapCam Camera" (1280x720@30 RGB24)
if exist "%BIN%\AkVCamManager.exe" (
  "%BIN%\AkVCamManager.exe" add-device -i ChapCamCamera "ChapCam Camera"
  "%BIN%\AkVCamManager.exe" add-format ChapCamCamera RGB24 1280 720 30
  "%BIN%\AkVCamManager.exe" update
  echo [ChapCam] Peripherique "ChapCam Camera" cree
)

echo [ChapCam] Installation du pilote terminee.
endlocal
exit /b 0
