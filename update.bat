@echo off
:: =============================================================================
::  Saints Gaming — Update Shortcut (Windows)
::  Delegates directly to scripts/update.bat with all supplied arguments.
:: =============================================================================

call "%~dp0scripts\update.bat" %*
