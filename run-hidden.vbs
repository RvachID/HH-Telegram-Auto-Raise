Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "E:\OpenServer\domains\hh-telegram-autoraise"

command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File ""E:\OpenServer\domains\hh-telegram-autoraise\run.ps1"""
shell.Run command, 0, True
