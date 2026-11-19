import json
from pathlib import Path
import subprocess
import sys

script = Path(__file__).with_name("previous-release.py")
releases = [
    {"tagName": tag, "isDraft": draft, "isPrerelease": prerelease}
    for tag, draft, prerelease in [
        ("v0.1.0", False, False), ("v0.1.1", False, False),
        ("v0.2.0", True, False), ("v0.9.0", False, True),
        ("0.1.9", False, False), ("v0.3.0-beta", False, True),
    ]
]


def select(current):
    return subprocess.run([sys.executable, str(script), current], input=json.dumps(releases),
                          text=True, capture_output=True, check=False)


assert select("0.1.1").stdout.strip() == "0.1.0"
assert select("0.2.0").stdout.strip() == "0.1.1"
assert select("0.1.0").returncode != 0
print("Previous-release selection checks passed.")
