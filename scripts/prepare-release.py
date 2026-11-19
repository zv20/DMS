import argparse
import json
from pathlib import Path
import re


def parse_version(value):
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        raise ValueError(f"Invalid version: {value}")
    return tuple(map(int, match.groups()))


def next_version(current, latest):
    current, latest = parse_version(current), parse_version(latest)
    if current[:2] < latest[:2]:
        raise ValueError("The test branch uses an older major/minor version than the latest release")
    if current[:2] > latest[:2]:
        return ".".join(map(str, current))
    return ".".join(map(str, (*current[:2], max(current[2], latest[2] + 1))))


def prepare(project, changelog, releases, subjects):
    project_text = project.read_text(encoding="utf-8")
    versions = re.findall(r"<Version>(\d+\.\d+\.\d+)</Version>", project_text)
    if len(versions) != 1:
        raise ValueError("Expected exactly one project version")
    stable = []
    for release in releases:
        tag = release["tagName"]
        if release["isDraft"] or release["isPrerelease"] or not re.fullmatch(r"v\d+\.\d+\.\d+", tag):
            continue
        stable.append((parse_version(tag[1:]), tag))
    if not stable:
        raise ValueError("No published stable release found")
    latest_version, latest_tag = max(stable)
    version = next_version(versions[0], ".".join(map(str, latest_version)))
    if any(release["tagName"] == "v" + version for release in releases):
        raise ValueError(f"Release v{version} already exists")

    notes = changelog.read_text(encoding="utf-8")
    heading = f"## {version}"
    section_pattern = r"(?m)^" + re.escape(heading) + r"[ \t]*$"
    if len(re.findall(section_pattern, notes)) > 1:
        raise ValueError(f"Duplicate changelog section: {heading}")
    if not re.search(section_pattern, notes):
        if re.search(r"(?m)^## Unreleased[ \t]*$", notes):
            notes = re.sub(r"(?m)^## Unreleased[ \t]*$", heading, notes, count=1)
        else:
            entries = [subject.strip() for subject in subjects if subject.strip() and not subject.startswith("chore: prepare release ")]
            if not entries:
                raise ValueError("No release notes or commit subjects found")
            section = heading + "\n\n" + "\n".join(f"- {entry}" for entry in entries) + "\n\n"
            notes = notes.replace("# Changelog\n\n", "# Changelog\n\n" + section, 1)
            if heading not in notes:
                raise ValueError("Changelog heading not found")
    start = re.search(section_pattern, notes).end()
    following = re.search(r"(?m)^## ", notes[start:])
    body = notes[start:start + following.start()] if following else notes[start:]
    if not body.strip():
        raise ValueError(f"Changelog section for {version} is empty")

    project.write_text(project_text.replace(f"<Version>{versions[0]}</Version>", f"<Version>{version}</Version>"), encoding="utf-8")
    changelog.write_text(notes, encoding="utf-8")
    return version, latest_tag


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("releases", type=Path)
    parser.add_argument("subjects", type=Path)
    args = parser.parse_args()
    result, _ = prepare(Path("DMS/DMS.csproj"), Path("CHANGELOG.md"),
                        json.loads(args.releases.read_text(encoding="utf-8")),
                        args.subjects.read_text(encoding="utf-8").splitlines())
    print(result)


if __name__ == "__main__":
    main()
