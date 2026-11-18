import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("version")
parser.add_argument("output", type=Path)
args = parser.parse_args()

lines = Path("CHANGELOG.md").read_text(encoding="utf-8").splitlines()
heading = f"## {args.version}"
if lines.count(heading) != 1:
    raise SystemExit(f"Expected exactly one changelog section for {args.version}")
start = lines.index(heading)
end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
if not any(line.strip() for line in lines[start + 1:end]):
    raise SystemExit(f"No release notes for {args.version}")


def rtf_escape(text):
    result = []
    for char in text:
        if char in "\\{}":
            result.append("\\" + char)
        elif ord(char) < 128:
            result.append(char)
        else:
            encoded = char.encode("utf-16-le")
            for index in range(0, len(encoded), 2):
                unit = int.from_bytes(encoded[index:index + 2], "little", signed=True)
                result.append(f"\\u{unit}?")
    return "".join(result)


paragraphs = []
for line in lines[start:]:
    if line.startswith("## "):
        paragraphs.append(r"\b " + rtf_escape(line[3:]) + r"\b0\par")
    else:
        paragraphs.append(rtf_escape(line) + r"\par")
args.output.write_text(r"{\rtf1\ansi\deff0{\fonttbl{\f0 Arial;}}\f0\fs18 " + "\n".join(paragraphs) + "}", encoding="ascii")
