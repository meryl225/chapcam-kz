@echo off
REM ============================================================
REM Desinstallation du pilote camera virtuelle "ChapCam Camera"
REM Appele par le hook NSIS customUnInstall (en administrateur).
REM ============================================================
setlocal
set DRV=%~1
if "%DRV%"=="" set DRV=%~dp0

echo [ChapCam] Suppression du peripherique "ChapCam Camera"...

REM 1) Supprimer le peripherique
if exist "%DRV%\x64\AkVCamManager.exe" (
  "%DRV%\x64\AkVCamManager.exe" remove-device ChapCamCamera
  "%DRV%\x64\AkVCamManager.exe" update
  "%DRV%\x64\AkVCamManager.exe" uninstall
)

REM 2) Desenregistrer les filtres DirectShow
if exist "%DRV%\x64\AkVirtualCamera.plugin\x64\AkVCamSink.dll" (
  regsvr32 /s /u "%DRV%\x64\AkVirtualCamera.plugin\x64\AkVCamSink.dll"
)
if exist "%DRV%\x86\AkVirtualCamera.plugin\x86\AkVCamSink.dll" (
  regsvr32 /s /u "%DRV%\x86\AkVirtualCamera.plugin\x86\AkVCamSink.dll"
)

echo [ChapCam] Pilote ChapCam Camera supprime.
endlocal
exit /b 0
