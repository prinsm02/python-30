# How To Run Python 30

## Every morning (20 minutes)
1. Open **https://prinsm02.github.io/python-30/** on any device: iPhone, Android, Mac or PC. On the Desktop, double-click `Python 30 (open the course)`.
2. Tap the big orange button. It always opens the next day you have not finished.
3. Follow the five steps: **Warm-up** (3 questions), **Why** (tap-through cards), **Watch** (run an example, then break it on purpose), **Do** (3 small tasks), **Win**.
4. In a task: type your code, tap **Run** to see what it does, tap **Check** to mark it. The next day unlocks when all three tasks pass.

Nothing to install. Real Python runs inside the page. The first Run of the day takes a few seconds while Python loads.

## Put it on your phone's Home Screen
- **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap the three dots, then **Add to Home screen**.

## When you are stuck
1. Tap **Hint**. There are 2 or 3 per task, and after the last one the answer shows.
2. Tap **Ask the tutor**. It copies your task, your code and the error. Open Claude, pick the **Haiku** model, paste and send. This is the only part that uses tokens.

## Good to know
- **Progress is saved on each device.** Do the course on one main device (your phone is best). A second device starts at Day 1.
- **PC days:** from Day 19 some days have an "On the PC" list (VS Code, the terminal, Git). On your phone, tap "Save this for the PC". It waits on the home screen until you tick it off.
- **Fridays are boss builds:** the three tasks build one small game or tool.
- **Weekends:** nothing. The course waits for you.

## The 5am reminder
- A small Claude task (`python-30-5am`, Haiku, low effort) emails you the link at about 05:00, Monday to Friday, and sends a notification. It reads nothing and costs almost nothing.
- It only runs while the Claude desktop app is open on the PC. If the PC was off, it runs when the app next opens. The course itself never needs the PC: the link always works.
- **Pause for shoot weeks:** double-click `Pause or Resume.bat` in this folder to stop the pings (run it again to restart).

## For Claude
- Python: `C:\Users\Matthew Prins\AppData\Local\Programs\Python\Python312\python.exe`
- Lessons are edited only in `lessons\DNN.json` (rules: `tools\LESSON SPEC.md`). Then run `tools\verify.py`: it checks every day (each solution must pass, each starter must fail) and rebuilds `app\lessons.js`, `app\harness.js` and `tutor\DNN.md`. Never hand-edit those three.
- Publish: this folder is a git repo (`prinsm02/python-30`, public, branch `main`, GitHub Pages). After a rebuild: `git add -A`, `git commit`, `git push`.
- Local test: preview `python-30` (port 8797). Add `?dev` to the address to unlock every day.
- Tutor help: read only `tutor\DNN.md` for that day (answers, hints, key points). Use a cheap model.
