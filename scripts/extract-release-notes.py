import re
import sys
from pathlib import Path

version, output = sys.argv[1:]
if not re.fullmatch(r"\d+\.\d+\.\d+", version):
    raise SystemExit("Invalid release version")
lines = Path("CHANGELOG.md").read_text(encoding="utf-8").splitlines()
heading = f"## {version}"
if lines.count(heading) != 1:
    raise SystemExit(f"Expected exactly one changelog section for {version}")
start = lines.index(heading)
end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
notes = "\n".join(lines[start:end]).strip()
if not any(line.strip() for line in lines[start + 1:end]):
    raise SystemExit(f"Changelog section for {version} is empty")
Path(output).write_text(notes + "\n", encoding="utf-8")
