Set WshShell = CreateObject("WScript.Shell")
ScriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' Run run.bat hidden (0 = hidden window, False = don't wait)
WshShell.Run """" & ScriptDir & "\run.bat""", 0, False
