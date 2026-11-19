import json
import re
import sys


def version(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", value)
    return tuple(map(int, match.groups())) if match else None


current = version(sys.argv[1])
if current is None:
    raise SystemExit("Expected a three-part current version")
releases = json.load(sys.stdin)
previous = max(
    (number for release in releases
     if not release["isDraft"] and not release["isPrerelease"]
     if (number := version(release["tagName"])) is not None and number < current
     if release["tagName"] == "v" + ".".join(map(str, number))),
    default=None,
)
if previous is None:
    raise SystemExit("No earlier stable release found for the upgrade test")
print(".".join(map(str, previous)))
