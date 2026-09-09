"""Upload once; retries reuse byte-identical existing content instead of replacing releases."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

version = os.environ["RELEASE_VERSION"]
tag = os.environ["RELEASE_TAG"]
archive = Path(f"dist/theme-hanlo-{version}.zip")
checksum = archive.with_name(archive.name + ".sha256")
try:
    release = json.loads(subprocess.check_output(["gh", "release", "view", tag, "--json", "assets"], text=True))
except (subprocess.CalledProcessError, ValueError) as error:
    raise RuntimeError("Cannot inspect existing GitHub assets") from error
names = {item["name"] for item in release["assets"]}
if archive.name in names:
    with tempfile.TemporaryDirectory() as temporary:
        subprocess.run(["gh", "release", "download", tag, "--pattern", archive.name, "--dir", temporary], check=True)
        existing = Path(temporary) / archive.name
        with zipfile.ZipFile(existing) as old, zipfile.ZipFile(archive) as new:
            old_names = {n for n in old.namelist() if not n.endswith("/")}
            new_names = {n for n in new.namelist() if not n.endswith("/")}
            assert old_names == new_names, "Existing GitHub package has a different file list"
            assert all(old.read(n) == new.read(n) for n in old_names), "Existing GitHub package content differs"
        shutil.copyfile(existing, archive)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum.write_text(f"{digest}  {archive.name}\n")
else:
    subprocess.run(["gh", "release", "upload", tag, str(archive)], check=True)
if checksum.name not in names:
    subprocess.run(["gh", "release", "upload", tag, str(checksum)], check=True)
else:
    with tempfile.TemporaryDirectory() as temporary:
        subprocess.run(["gh", "release", "download", tag, "--pattern", checksum.name, "--dir", temporary], check=True)
        assert (Path(temporary) / checksum.name).read_bytes() == checksum.read_bytes(), "Existing checksum differs"
print(f"GitHub {tag}: package and SHA-256 ready")
