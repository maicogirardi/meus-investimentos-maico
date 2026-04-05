$ErrorActionPreference = "Stop"

& "$PSScriptRoot\\build-firebase.ps1"
npx firebase-tools deploy --only hosting

