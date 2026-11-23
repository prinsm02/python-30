# Python 30: lesson spec (read fully before writing a lesson)

## Who it is for
Matthew, a filmmaker (1st AD, gaffer, editor), runner, total Python beginner. He does the lesson at 5am, often on his phone, in 20 minutes. Two earlier courses failed because they were long reading with no doing. He said: "you tell me to do things and I do not know what I am doing or why". So: the WHY first, tiny steps, lots of doing, quick wins.

## Hard rules
- One new idea per day. Use ONLY things taught on earlier days plus today's idea (see the day list). Never use a feature before its day.
- Plain short sentences. Second person. No jargon without a one-line meaning. No em dashes, no en dashes, no curly quotes (the checker fails them). No emojis.
- Theme mix: about half the tasks are his real world (call sheets, shot lists, crew, gear, slates, day rates in rand, running pace, invoices), the rest plain everyday examples. Fridays (days 5, 10, 15, 20, 25, 30) are a "boss build": the three tasks build one small game or tool step by step, task 3 is the finished thing.
- Typing is on a phone: keep code short. A task solution is 1 to 12 lines (boss builds up to 20). Names short. No long strings to retype: put long text in the starter.
- Tasks go easy, medium, stretch. Task 1 must be nearly impossible to fail.
- Why cards: 3 to 5 cards, each max 520 characters, one thought per card. Use `backticks` for code and **bold** for a new word. A code line on its own line shows well.
- Everything must run in the browser (Pyodide, Python 3.12): standard library only. No network, no pip, no subprocess, no real clock in expected output (never print today's date or time).

## File
`lessons\DNN.json`, UTF-8, the exact shape of `lessons\D01.json` (read it, it is the template). Fields:
- `id` "D07", `day` 7, `week` 2, `title` (max 40 chars, friendly), `hook` (one line: what he can do after today), `badge` (2 or 3 words).
- `warmup`: exactly 3 multiple-choice questions on EARLIER days (spaced repetition: one from yesterday, one from about 3 days back, one older). Each: `q`, `options` (exactly 3), `answer` (0, 1 or 2, vary it), `explain`.
- `why`: the cards.
- `watch`: `intro`, `code` (a worked example that runs; add `inputs` list if it uses input(), `files` dict if it reads files), `explain` (3 or 4 lines), `break_it` (tell him one thing to change to cause a specific error, and what the error will say).
- `tasks`: exactly 3. Each: `title`, `task` (what to make, show exact expected text in backticks), `starter`, `solution`, `hints` (2 or 3, from gentle nudge to nearly the answer), `tests` (1 or more), optional `code_has` / `code_not` (lists of text that must / must not be in his code, e.g. `"code_has": ["for "]` so he cannot just print the answer).
- `recap`: 3 to 5 one-line takeaways. `words`: 3 to 6 `{term, meaning}`.
- Optional `pc`: `{title, why, steps: [...]}` = a short "when you are at the PC" checklist (days 19, 20, 25 to 30). Steps are exact clicks and commands for Windows with VS Code. He ticks them off himself.

## Editor tips (`lessons\editor.json`)
One entry per day, keyed by day id: `{app, title, text, try}`. `app` is "VS Code", "Cursor" or "VS Code and Cursor". `text` (max 480 chars) says what the thing is and why it helps, tied to that day's Python idea where possible. `try` (max 300 chars) is one 2-minute action at the PC with exact keys (Windows). Go slowly: one skill a day, VS Code for Days 1 to 25, Cursor from Day 26. Matthew has no Cursor plan yet, so never require paid features, and do not state prices (they change).

## Tests (how a task is marked)
Each test is `{inputs?, files?, seed?, expect?, contains?, expect_files?}`.
- The program runs with `inputs` fed to input() in order. **Output includes the prompt and the typed answer, like a real terminal.** Example: `name = input("Name? ")` then `print("Hi", name)` with `"inputs": ["Sam"]` gives output `Name? Sam\nHi Sam`.
- `expect`: full output must match (trailing spaces and blank lines at the end are ignored, everything else is exact).
- `contains`: list of pieces that must appear in the output (use when exact text is too strict).
- `files`: `{"name.txt": "content"}` created before the run. `expect_files`: files that must exist afterwards with that content.
- `seed`: number for random.seed, so random tasks give the same result every time. Work out the result with real Python 3.12 (`random.seed(n)` first) and write tests for it.
- Tasks with input(): give 2 tests with different inputs so the answer cannot be hard-coded.
- The solution must pass every test. The starter must FAIL (it is unfinished or buggy).

## Check your work (must pass before you finish)
```
& "C:\Users\Matthew Prins\AppData\Local\Programs\Python\Python312\python.exe" "C:\Users\Matthew Prins\Desktop\Python 30\tools\verify.py" D06 D07
```
Give only your own day ids. Fix until every one prints `ok`. Do not edit `verify.py`, `harness.py`, the `app` folder or other people's days.

## The 30 days (what each day teaches; "knows" = may be used from then on)
Week 1, Talk to the computer
- D01 print("text"), top to bottom, strings in quotes, reading errors. (written)
- D02 Variables: `name = value`, = means store, use the name later, change it, naming rules, NameError. Also f-strings: `f"Hello {name}"`.
- D03 Numbers: int and float, + - * /, // and %, brackets, `round(x, 2)`, `{x:.2f}` in f-strings. "5" is not 5.
- D04 input(): ask a question, input always gives text, int() and float() to convert, str(). ValueError on int("seven").
- D05 BOSS Mad Libs game: ask for words with input(), build a silly story with f-strings. Also teach comments with #.
Week 2, Decisions and repeats
- D06 if / else, comparisons == != < > <= >=, indentation (4 spaces) and the colon, True and False.
- D07 elif, and / or / not, checking ranges (e.g. overtime after 10 hours, pace zones).
- D08 while loops: repeat while true, counter, `+= 1`, break, the infinite loop mistake.
- D09 for loops and range(): range(5), range(1, 6), range(0, 10, 2), running totals.
- D10 BOSS Guess the number: `import random`, random.randint, while loop, too high / too low, count the tries. Tests use `seed`.
Week 3, Holding lots of things
- D11 Lists: [..], index from 0, negative index, len(), append(), `in`, change an item, IndexError.
- D12 Looping lists: `for item in list`, sum / min / max, sorted(), enumerate(list, 1) for numbered lists.
- D13 Dictionaries: {key: value}, look up, add, change, .get(), loop with .items(), KeyError.
- D14 Text tools: .upper() .lower() .title() .strip() .replace() .split() and " ".join(), `in` on strings, len of a string, slicing [:3].
- D15 BOSS Quiz game: a list of dictionaries (question, answer), loop, score, final message.
Week 4, Your own tools
- D16 Functions: def, parameters, calling, why (name a set of steps, reuse), docstring one-liner.
- D17 return vs print, default values, a function that calls a function, None.
- D18 Errors on purpose: try / except ValueError, ask again until valid (while True + break), ZeroDivisionError.
- D19 Modules: import math, random (choice, shuffle), datetime (timedelta, strptime, strftime with fixed dates only). `pc`: install check (`python --version`), open VS Code, make hello.py, run it in the terminal.
- D20 BOSS Call time and run pace calculator: functions that add minutes to a "HH:MM" time and work out pace per km from distance and time. `pc`: save it as a real .py file and run it.
Week 5, Real files
- D21 Files: `with open(name) as f`, read(), readlines / loop lines, write with "w", append with "a", FileNotFoundError. Tests use `files` and `expect_files`.
- D22 Folders with pathlib: Path, .name .stem .suffix, / to join, .exists(), .iterdir() and .glob("*.mp4") (use sorted()), .rename(). Tests give a small fake folder through `files`.
- D23 CSV: csv.reader, csv.DictReader, csv.writer (open with newline=""), totals from a column.
- D24 JSON: json.loads, json.dumps(indent=2), json.load / json.dump with files, nested data (list of dicts).
- D25 BOSS Shot list report and batch renamer: read a shot list CSV, print a tidy report with totals, then rename fake clip files to `ICL_S01_T01.mp4` style. `pc`: run the renamer on a real test folder of copies.
Week 6, Work-ready kit
- D26 Other people's code: pip and venv (explained, done in `pc`), reading documentation, using a standard-library module he has never seen (statistics, textwrap) from its docs. `pc`: make a venv, pip install requests.
- D27 Web APIs: what an API is, a response is JSON, status codes. In the browser he parses a saved API response given through `files`. `pc`: requests.get on a free public API and print one value.
- D28 Git and GitHub: save points, why, add / commit / push, .gitignore, README. Browser tasks are small tools that reinforce weeks 3 to 5 (e.g. write a README file with a program, filter a file list like .gitignore does). `pc`: git init, first commit, push to a new GitHub repo.
- D29 Debugging like a pro: read a traceback bottom up, print debugging, three broken programs to fix (logic bugs, not only typos). Also plan the capstone: pick one tool from a short list.
- D30 BOSS Capstone: a day-rate invoice tool (crew list as list of dicts or CSV, hours, overtime after 10 hours at 1.5x, totals in rand, written to a report file). `pc`: put it on GitHub with a README. Recap of the whole course and what to learn next.
