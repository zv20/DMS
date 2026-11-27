"""Check the safety-critical DMS MSI authoring without Windows build tools."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
installer = ET.parse(ROOT / "installer" / "DMS.wxs").getroot()
elements = list(installer.iter())


def local_name(element):
    return element.tag.rsplit("}", 1)[-1]


assert any(element.attrib.get("Id") == "RemoveDataDlg" for element in elements)
assert any(
    local_name(element) == "Publish"
    and element.attrib.get("Dialog") == "MaintenanceTypeDlg"
    and element.attrib.get("Control") == "RemoveButton"
    and element.attrib.get("Value") == "RemoveDataDlg"
    for element in elements
)
assert any(
    local_name(element) == "Property"
    and element.attrib.get("Id") == "DELETE_DMS_DATA"
    and element.attrib.get("Value") == "0"
    for element in elements
)
assert any(
    local_name(element) == "Control"
    and element.attrib.get("Property") == "DELETE_DMS_DATA"
    and element.attrib.get("CheckBoxValue") == "1"
    for element in elements
)
assert any(
    local_name(element) == "Property"
    and element.attrib.get("Id") == "DmsDataFolder"
    and element.attrib.get("Value") == "%APPDATA%\\DMS"
    for element in elements
)

cleanup = [element for element in elements if local_name(element) == "RemoveFolderEx"]
assert len(cleanup) == 1
assert cleanup[0].attrib == {
    "On": "uninstall",
    "Property": "DmsDataFolder",
    "Condition": "DELETE_DMS_DATA = 1 AND NOT UPGRADINGPRODUCTCODE",
}
assert not any(
    "Documents\\DMS Backups" in element.attrib.get("Value", "")
    for element in elements if local_name(element) == "Property"
)

release_workflow = (ROOT / ".github" / "workflows" / "auto-release.yml").read_text(encoding="utf-8")
assert "DELETE_DMS_DATA=1" in release_workflow
assert "Clean uninstall left DMS data behind." in release_workflow
assert "Clean uninstall removed a Documents backup." in release_workflow
assert "'WelcomeDlg', 'UpgradeInfoDlg', 'RemoveDataDlg', 'VerifyReadyDlg', 'ExitDialog'" in release_workflow

print("Installer clean-uninstall definition checks passed.")
