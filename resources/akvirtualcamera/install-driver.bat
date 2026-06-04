@echo off
REM ============================================================
REM Installation du pilote camera virtuelle "ChapCam Camera"
REM (akvirtualcamera : DirectShow + Media Foundation)
REM
REM Usage : install-driver.bat "<dossier_du_pilote>"
REM Appele par le hook NSIS customInstall (en administrateur).
REM
REM NB : les noms de DLL/exe ci-dessous correspondent a la distribution
REM officielle akvirtualcamera. Ajuste si ta version differe.
REM ============================================================
setlocal
set DRV=%~1
if "%DRV%"=="" set DRV=%~dp0

echo [ChapCam] Dossier pilote : %DRV%

REM 1) Enregistrer le filtre DirectShow (64 bits) -> OBS, Zoom, Discord, Chrome/Meet, Edge
if exist "%DRV%\x64\AkVirtualCamera.plugin\x64\AkVCamSink.dll" (
  regsvr32 /s "%DRV%\x64\AkVirtualCamera.plugin\x64\AkVCamSink.dll"
  echo [ChapCam] DirectShow x64 enregistre
)

REM 2) Enregistrer le filtre DirectShow (32 bits) -> apps 32 bits (anciennes versions)
if exist "%DRV%\x86\AkVirtualCamera.plugin\x86\AkVCamSink.dll" (
  regsvr32 /s "%DRV%\x86\AkVirtualCamera.plugin\x86\AkVCamSink.dll"
  echo [ChapCam] DirectShow x86 enregistre
)

REM 3) Installer l'assistant + le pont Media Foundation -> Microsoft Teams, app Camera Windows
if exist "%DRV%\x64\AkVCamManager.exe" (
  "%DRV%\x64\AkVCamManager.exe" set-loglevel 0
  "%DRV%\x64\AkVCamManager.exe" install
  echo [ChapCam] Assistant / Media Foundation installe
)

REM 4) Creer le peripherique visible "ChapCam Camera" + format par defaut 1280x720@30
if exist "%DRV%\x64\AkVCamManager.exe" (
  "%DRV%\x64\AkVCamManager.exe" add-device --id ChapCamCamera "ChapCam Camera"
  "%DRV%\x64\AkVCamManager.exe" set-description ChapCamCamera "ChapCam Camera"
  "%DRV%\x64\AkVCamManager.exe" add-format ChapCamCamera RGB24 1280 720 30
  "%DRV%\x64\AkVCamManager.exe" update
  echo [ChapCam] Peripherique "ChapCam Camera" cree
)

echo [ChapCam] Installation du pilote terminee.
endlocal
exit /b 0
