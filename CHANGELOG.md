# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added `run-hidden.vbs` for hidden scheduled launches without a visible PowerShell window.
- Added Telegram reply handling for `Sorry, operation has been temporarily suspended` with an immediate fallback to hh.ru.
- Added explicit hh.ru reauthorization guidance in logs with a pointer to `README.md` and `node src/prepareStorage.js`.

### Changed

- Updated `run.ps1` to hide its own console window immediately on startup.
- Updated `run.cmd` to start `sleep-check.ps1` via hidden PowerShell.
- Hardened Telegram menu handling to search for a visible toggle and retry opening the reply keyboard with multiple strategies.
- Wrapped the Telegram automation flow with a safe fallback to hh.ru when Telegram UI automation fails early.
- Improved hh.ru authentication detection so the fallback no longer mistakes the login screen for the resumes page.
- Updated hh.ru fallback login handling to support the current password-based reauthentication screen.

### Fixed

- Fixed a failure mode where Telegram automation stopped on a hidden `toggle-reply-markup` button and never reached the web fallback.
- Fixed misleading hh.ru fallback logs that previously reported `raise-button-not-found` when the real issue was expired authorization.
