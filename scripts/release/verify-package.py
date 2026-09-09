"""Verify a single release package using only the Python standard library."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import zipfile

version = os.environ["RELEASE_VERSION"]
assert re.fullmatch(r"\d+\.\d+\.\d+", version), "Invalid release version"
package_dir = Path(os.environ.get("PACKAGE_DIR", "dist"))
archive_path = package_dir / f"theme-hanlo-{version}.zip"
checksum_path = archive_path.with_name(archive_path.name + ".sha256")
assert set(p.name for p in package_dir.iterdir()) == {archive_path.name, checksum_path.name}, "Unexpected release assets"
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
assert checksum_path.read_text().strip().split() == [digest, archive_path.name], "Checksum mismatch"
try:
    archives = json.loads(Path("releases/archives.json").read_text())
except (OSError, ValueError) as error:
    raise RuntimeError("Cannot read historical release inventory") from error
if version in archives:
    assert digest == archives[version]["sha256"], "Historical package was modified"
    assert archive_path.stat().st_size == archives[version]["size"]
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None, "Corrupt ZIP"
    names = [entry.filename for entry in archive.infolist() if not entry.is_dir()]
    assert len(names) == len(set(names)), "Duplicate ZIP path"
    assert all(not PurePosixPath(n).is_absolute() and ".." not in PurePosixPath(n).parts for n in names), "Unsafe ZIP path"
    manifest = archive.read("theme.yaml").decode()
    assert re.search(r'^  name: theme-hanlo\s*$', manifest, re.M), "Unexpected theme identity"
    assert re.search(r'^  version: [\"\']?' + re.escape(version) + r'[\"\']?\s*$', manifest, re.M), "Manifest/version mismatch"
    assert "templates/index.html" in names and "THIRD_PARTY_NOTICES.txt" in names
    snapshot = os.environ.get("SNAPSHOT_DIR")
    if snapshot:
        root = Path(snapshot)
        for name in names:
            assert (root / name).read_bytes() == archive.read(name), f"Tag/package mismatch: {name}"
print(f"Verified {version}: {archive_path.stat().st_size} bytes, SHA-256 {digest}")
