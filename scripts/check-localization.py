"""Validate WinUI language resources without requiring the Windows build tools."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
catalogs = {}
for language in ("en-US", "bg-BG"):
    path = ROOT / "DMS" / "Strings" / language / "Resources.resw"
    items = ET.parse(path).getroot().findall("data")
    values = {item.attrib["name"]: item.findtext("value") for item in items}
    assert len(values) == len(items), f"Duplicate keys in {language}"
    assert all(values.values()), f"Empty translations in {language}"
    catalogs[language] = values

english, bulgarian = catalogs.values()
assert english.keys() == bulgarian.keys(), "Language keys differ"
for key in english:
    placeholders = lambda value: sorted(re.findall(r"\{\d+(?:[^{}]*)\}", value))
    assert placeholders(english[key]) == placeholders(bulgarian[key]), f"Placeholder mismatch: {key}"

for path in (ROOT / "DMS").rglob("*.cs"):
    for key in re.findall(r'(?:L|Localization)\.(?:Get|Format)\("([^\"]+)"', path.read_text()):
        assert key in english, f"Missing resource {key} in {path}"

uid = "{http://schemas.microsoft.com/winfx/2006/xaml}Uid"
for path in (ROOT / "DMS").rglob("*.xaml"):
    for element in ET.parse(path).iter():
        if uid in element.attrib:
            prefix = element.attrib[uid] + "."
            assert any(key.startswith(prefix) for key in english), f"Missing UID {prefix} in {path}"

print(f"PASS: {len(english)} matching EN/BG keys, placeholders, code references, and XAML UIDs")
