#!/usr/bin/env python3
"""Daily STATUS.md maintenance — runs in CI (no API key needed).

Stamps the "Last updated" date and appends a dated entry to the Daily log
based on the commits made in the last day, so the tracker stays current
even when no Claude session is alive.

Run manually:  TZ=America/Los_Angeles python3 scripts/update-status.py
"""
import os
import re
import subprocess
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS = os.path.join(ROOT, "STATUS.md")

# Today's date in whatever TZ the workflow sets (defaults to UTC otherwise).
today = datetime.date.today().isoformat()

# Commit subjects from the last ~26h, skipping the routine's own commits.
SKIP = ("Daily status update", "Add STATUS.md", "Merge ", "Auto-log")
try:
    out = subprocess.check_output(
        ["git", "log", "--since=26 hours ago", "--pretty=format:%s"],
        cwd=ROOT, text=True,
    )
except subprocess.CalledProcessError:
    out = ""
subjects = [
    s.strip() for s in out.splitlines()
    if s.strip() and not any(s.strip().startswith(p) for p in SKIP)
]
# De-dupe while preserving order.
seen, commits = set(), []
for s in subjects:
    if s not in seen:
        seen.add(s)
        commits.append(s)

with open(STATUS, "r", encoding="utf-8") as f:
    text = f.read()

# 1) Refresh the "Last updated" line.
text = re.sub(r"(\*\*Last updated:\*\*\s*).*", r"\g<1>" + today, text, count=1)

# 2) Append today's log entry under "## 📓 Daily log" (only once per day).
already = ("**" + today + "**") in text

if not already:
    if commits:
        body = "Auto-log — %d change(s): %s." % (len(commits), "; ".join(commits))
    else:
        body = "Auto-log — no code changes; open action items unchanged."
    entry = "- **%s** — %s\n" % (today, body)
    # Insert right after the "## 📓 Daily log" heading line.
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if line.strip().startswith("## 📓 Daily log"):
            # find first non-empty line after heading to place above existing entries
            insert_at = i + 1
            while insert_at < len(lines) and lines[insert_at].strip() == "":
                insert_at += 1
            lines.insert(insert_at, entry)
            break
    text = "".join(lines)

with open(STATUS, "w", encoding="utf-8") as f:
    f.write(text)

print("STATUS.md updated for %s (%d commit(s) summarized)." % (today, len(commits)))
