# About: Python 30

**Purpose:** Matthew's Python course, version 3. Thirty 20-minute mornings (Mon to Fri, 6 weeks). It is a web app that runs real Python inside the page, so it works on iPhone, Android, Mac and PC with nothing to install and no tokens per lesson. Every lesson is written and tested up front. Live at https://prinsm02.github.io/python-30/.

**Start here:** `00 How To Run.md`.

**Why this version (2026-11-23):** v1 (email PDFs) and v2 (desktop app + VS Code) were not attended. Matthew asked for a day-by-day course on the Desktop, creative, fitted to how he learns, 20 minutes at 5am, on every device, lowest tokens, a mix of real-work tools, games and plain examples, and practical by the end.

**Files here**
- `index.html`: the app page.
- `Python 30 (open the course).url`: opens the live course.
- `Pause or Resume.bat`: stops or starts the 5am email (makes or removes `PAUSED.txt`).

**Sub-folders**
- `app`: the player (`engine.js`, `style.css`, icons) and the built data (`lessons.js`, `harness.js`). Built files are never edited by hand.
- `lessons`: the 30 lesson sources, `D01.json` to `D30.json`, plus `editor.json` (one VS Code or Cursor tip per day, merged into each lesson by the checker; added 2026-11-23 because Matthew wants the course to slowly teach him VS Code and Cursor, and he has no Cursor plan yet). The only place lessons are edited.
- `tutor`: one short note per day (key points, hints, answers) for a cheap helper model. Built from the lessons.
- `tools`: `verify.py` (checks every lesson and builds the app data), `harness.py` (the one code runner used by both the app and the checker), `LESSON SPEC.md` (the rules for writing a lesson).

**The 30 days:** week 1 print, variables, numbers, input, Mad Libs. Week 2 if, elif, while, for, guess the number. Week 3 lists, loops over lists, dictionaries, text tools, quiz game. Week 4 functions, return, try/except, modules, call time and pace planner. Week 5 files, folders, CSV, JSON, shot report and renamer. Week 6 pip and venv, web APIs, Git and GitHub, debugging, capstone invoice tool.

**Naming:** lessons `DNN.json`; tutor notes `DNN.md`.

**Honest scope:** 30 x 20 minutes is about 10 hours. It gets Matthew reading Python, automating his own work and showing small tools on GitHub. It is a strong start, not a job guarantee.

## Where this came from
Created 2026-11-23 by Claude at Matthew's request ("stop any Python lessons and reinvent the Python course day for day and save on Desktop"). The engine, checker, spec and Day 1 were written by Claude. Days 2 to 30 were written by six Sonnet agents to the spec, drawing ideas from the old v2 lessons, CS50P and Automate the Boring Stuff, then checked by `verify.py`. The old course is archived at `Cluade Ai Work Station\01 Personal\19 Coding Lessons\10 Old Python Quest v2 (archive)`.
