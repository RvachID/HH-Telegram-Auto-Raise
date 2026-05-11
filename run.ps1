$workdir = "E:\OpenServer\domains\hh-telegram-autoraise"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class ConsoleWindow {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$consoleHandle = [ConsoleWindow]::GetConsoleWindow()
if ($consoleHandle -ne [IntPtr]::Zero) {
    [ConsoleWindow]::ShowWindow($consoleHandle, 0) | Out-Null
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c run.cmd"
$psi.WorkingDirectory = $workdir
$psi.WindowStyle = "Hidden"
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $false

$p = [System.Diagnostics.Process]::Start($psi)
$p.WaitForExit()
