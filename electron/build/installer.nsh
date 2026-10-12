; ============================================================
; Hooks NSIS pour ChapCam Desktop
; Installe / desinstalle la camera virtuelle native "ChapCam Camera"
; (source Media Foundation, Windows 11). L'installeur est perMachine,
; donc deja eleve en administrateur.
; ============================================================

!macro customInstall
  DetailPrint "Installation de la camera ChapCam Camera..."
  nsExec::ExecToLog '"$INSTDIR\resources\vcam\win\chapcam-vcam.exe" install'
  Pop $0
  ${If} $0 == "2"
    DetailPrint "ChapCam Camera necessite Windows 11 : camera virtuelle non installee."
  ${ElseIf} $0 != "0"
    DetailPrint "ChapCam Camera : echec de l'installation (code $0)"
  ${EndIf}
!macroend

!macro customUnInstall
  DetailPrint "Suppression de la camera ChapCam Camera..."
  nsExec::ExecToLog '"$INSTDIR\resources\vcam\win\chapcam-vcam.exe" uninstall'
  Pop $0
!macroend
