; ============================================================
; Hooks NSIS pour ChapCam Desktop
; Installe / desinstalle le pilote de camera virtuelle "ChapCam Camera"
; (akvirtualcamera : DirectShow + Media Foundation).
;
; Requiert des privileges administrateur (cf. requestedExecutionLevel
; dans electron-builder.yml).
; ============================================================

!macro customInstall
  DetailPrint "Installation du pilote ChapCam Camera..."
  ; $INSTDIR\resources\akvirtualcamera contient les binaires (extraResources)
  ; install-driver.bat enregistre les DLL DirectShow + Media Foundation,
  ; installe l'assistant, puis cree le peripherique "ChapCam Camera".
  nsExec::ExecToLog '"$INSTDIR\resources\akvirtualcamera\install-driver.bat" "$INSTDIR\resources\akvirtualcamera"'
  Pop $0
  DetailPrint "Pilote ChapCam Camera : code retour $0"
!macroend

!macro customUnInstall
  DetailPrint "Suppression du pilote ChapCam Camera..."
  nsExec::ExecToLog '"$INSTDIR\resources\akvirtualcamera\uninstall-driver.bat" "$INSTDIR\resources\akvirtualcamera"'
  Pop $0
  DetailPrint "Pilote ChapCam Camera supprime : code retour $0"
!macroend
