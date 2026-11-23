@echo off
rem Python 30: stop or start the 5am reminder. The course itself always waits for you.
cd /d "%~dp0"
if exist "PAUSED.txt" (
  del "PAUSED.txt"
  echo Python 30 reminders are ON again.
) else (
  echo paused> "PAUSED.txt"
  echo Python 30 reminders are PAUSED. Run this again to switch them back on.
)
pause
