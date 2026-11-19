import importlib.util
from pathlib import Path
import tempfile

spec = importlib.util.spec_from_file_location("prepare_release", Path(__file__).with_name("prepare-release.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.next_version("0.1.1", "0.1.1") == "0.1.2"
assert module.next_version("0.1.2", "0.1.1") == "0.1.2"
assert module.next_version("0.1.1", "0.1.5") == "0.1.6"
assert module.next_version("0.2.0", "0.1.5") == "0.2.0"
try:
    module.next_version("0.1.1", "0.2.0")
except ValueError:
    pass
else:
    raise AssertionError("An older minor version must not be released")

releases = [{"tagName": "v0.1.1", "isDraft": False, "isPrerelease": False}]
with tempfile.TemporaryDirectory() as folder:
    project = Path(folder) / "project.xml"
    changelog = Path(folder) / "changelog.md"
    project.write_text("<Project><Version>0.1.1</Version></Project>", encoding="utf-8")
    changelog.write_text("# Changelog\n\n## Unreleased\n\n- New feature.\n\n## 0.1.1\n\n- Old.\n", encoding="utf-8")
    number, _ = module.prepare(project, changelog, releases, ["ignored"])
    assert number == "0.1.2" and "<Version>0.1.2</Version>" in project.read_text()
    assert "## 0.1.2\n\n- New feature." in changelog.read_text()
    number, _ = module.prepare(project, changelog, releases, ["ignored"])
    assert number == "0.1.2" and changelog.read_text().count("## 0.1.2") == 1
    project.write_text("<Project><Version>0.2.0</Version></Project>", encoding="utf-8")
    changelog.write_text("# Changelog\n\n## 0.1.1\n\n- Old.\n", encoding="utf-8")
    number, _ = module.prepare(project, changelog, releases, ["Improve menu", "Fix printing"])
    assert number == "0.2.0" and "- Improve menu\n- Fix printing" in changelog.read_text()
print("Release preparation checks passed.")
