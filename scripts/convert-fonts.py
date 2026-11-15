#!/usr/bin/env python3
"""Generate unicode-range WOFF2 subsets from authenticated upstream fonts.

Usage: python3 scripts/convert-fonts.py /path/to/upstream/ttfs [--check]
For the original authenticated WOFF2 inputs, add --woff2-input.
See public/assets/fonts/PROVENANCE.md for source and license details.
"""

import argparse
from bisect import bisect_right
import hashlib
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


FONTS = {
    "MapleMono-NF-CN-Regular": ("bb8e8e8c263896f42555107202f1847f7a42c340a3e532df9c4d585c9794411c", "d0b27105e6958854fb060b8a1397c9dfabc42af8f607e360df5ff61e2c4cb069", "Maple Mono NF CN", "normal", 400),
    "MapleMono-NF-CN-Bold": ("9e0c22a032c255b2da2c073d6cca6f8cf6fd6f214ae5407eb9f1aa523713729b", "3560647cd3be06fbd13141cc42583fa7f2bcd5dc9dd6a54dffa9d5bcc2af648c", "Maple Mono NF CN", "normal", 700),
    "MapleMono-NF-CN-Italic": ("39e6c6e611e65e6d0780f6279561f954f9db51221987d0924c45f6121eaf9054", "8c51c25b5dacc96134494c4bef64511efdd73ea212435c46035fbc479d981c0d", "Maple Mono NF CN", "italic", 400),
    "MapleMono-NF-CN-BoldItalic": ("9d6e76fbb5767406efd1f5ae2d32f5439de3b4d4063b128e4186ad5619267120", "1bdbfd1f6a4dc8f21d56fe8243838937be9937a9c6b516f34df9acb4ab1655ff", "Maple Mono NF CN", "italic", 700),
    "LXGWWenKai-Regular": ("39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009", "8c92d1b42fbfc8e6f81eb57810d58c85106e8682d1d05e9cda31552326e440d3", "LXGW WenKai", "normal", 400),
    "LXGWWenKai-Medium": ("d4bdeb38a39151d74d084cba5090f8cb7d20bf83eedb78c35939ae70b9f4e3f6", "ec2022329b12de91682436d5ddb0353b71d5cfffcaa83763b3861ad898e1047f", "LXGW WenKai", "normal", 500),
}
ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / "public/assets/fonts"
CSS = ROOT / "src/css/components/fonts.css"


def common_codepoints():
    common = set(range(0x3400)) | set(range(0xFF00, 0xFFF0))
    for first in range(0xB0, 0xD8):
        for second in range(0xA1, 0xFF):
            try:
                common.add(ord(bytes((first, second)).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    return common


def ranges(codepoints, repertoire):
    result = []
    start = end = None
    for value in sorted(repertoire):
        if value in codepoints:
            if start is None:
                start = value
            end = value
        elif start is not None:
            result.append((start, end))
            start = end = None
    if start is not None:
        result.append((start, end))
    assert {value for value in repertoire if (i := bisect_right(result, (value, 0x110000)) - 1) >= 0 and value <= result[i][1]} == codepoints
    return result


def generate_subset(job):
    source, output, chunk = job
    with TTFont(source, recalcTimestamp=False) as font:
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = [record.nameID for record in font["name"].names]
        options.name_legacy = True
        options.name_languages = ["*"]
        options.glyph_names = True
        subsetting = subset.Subsetter(options=options)
        subsetting.populate(unicodes=chunk)
        subsetting.subset(font)
        font.flavor = "woff2"
        font.save(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--woff2-input", action="store_true", help="use the authenticated original complete WOFF2 inputs")
    parser.add_argument("--check", action="store_true", help="validate existing subsets and generated CSS")
    args = parser.parse_args()
    extension = "woff2" if args.woff2_input else "ttf"
    for name, info in FONTS.items():
        source = args.source / f"{name}.{extension}"
        if hashlib.sha256(source.read_bytes()).hexdigest() != info[1 if args.woff2_input else 0]:
            raise ValueError(f"Unexpected input checksum: {source}")

    css_records = []
    common = common_codepoints()
    outputs = {}
    with tempfile.TemporaryDirectory(dir=DESTINATION.parent) as temporary, ProcessPoolExecutor(max_workers=4) as executor:
        directory = DESTINATION if args.check else Path(temporary)
        for faceorder, (name, (_, _, family, style, weight)) in enumerate(FONTS.items()):
            source = args.source / f"{name}.{extension}"
            with TTFont(source, recalcTimestamp=False) as original:
                original_cmap = original.getBestCmap()
                remaining = sorted(set(original_cmap) - common)
                chunks = [set(original_cmap) & common]
                chunks.extend(set(remaining[i:i + 2048]) for i in range(0, len(remaining), 2048))
                assert all(ord(c) in chunks[0] for c in "中文漢字" if ord(c) in common)
                if name.startswith("Maple"):
                    assert set(range(0x20, 0x7F)) <= chunks[0]
                    assert all(cp in original_cmap for cp in (0xE0B0, 0xF120, 0xF0001))
                if not args.check:
                    worker_source = source
                    if args.woff2_input:
                        worker_source = Path(temporary) / f"{name}.ttf"
                        original.flavor = None
                        original.save(worker_source)
                    jobs = [(worker_source, directory / f"{name}-{i:02d}.woff2", chunk)
                            for i, chunk in enumerate(chunks)]
                    list(executor.map(generate_subset, jobs))
                    if args.woff2_input:
                        worker_source.unlink()
                declared_ranges = []
                covered = set()
                total = 0
                for index, chunk in enumerate(chunks):
                    filename = f"{name}-{index:02d}.woff2"
                    output = directory / filename
                    with TTFont(output, recalcTimestamp=False) as converted:
                        cmap = converted.getBestCmap()
                        assert set(cmap) == chunk and not covered.intersection(cmap), output
                        for cp, glyph in cmap.items():
                            for table in ("hmtx", "vmtx"):
                                if table in original:
                                    assert converted[table].metrics[glyph] == original[table].metrics[original_cmap[cp]], (output, table, cp)
                        assert converted["name"].getDebugName(1) == original["name"].getDebugName(1), output
                        assert converted.getTableData("name") == original.getTableData("name"), output
                        for table in ("fpgm", "prep", "cvt "):
                            if table in original:
                                assert converted.getTableData(table) == original.getTableData(table), (output, table)
                        if name.startswith("Maple"):
                            for cp in (0x3D, 0x3E, 0xE0B0, 0xF120, 0xF0001):
                                if cp in chunk:
                                    glyph = original_cmap[cp]
                                    assert converted["glyf"][cmap[cp]] == original["glyf"][glyph], (output, cp)
                            if index == 0:
                                glyph = "exclam_equal.liga"
                                assert converted["glyf"][glyph] == original["glyf"][glyph], (output, glyph)
                        if name.startswith("Maple") and index == 0:
                            assert any(f.FeatureTag == "calt" for f in converted["GSUB"].table.FeatureList.FeatureRecord), output
                    covered.update(cmap)
                    size = output.stat().st_size
                    total += size
                    outputs[filename] = hashlib.sha256(output.read_bytes()).hexdigest()
                    chunk_ranges = ranges(chunk, original_cmap)
                    declared_ranges.extend(chunk_ranges)
                    unicode_range = ", ".join(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}" for start, end in chunk_ranges)
                    css_records.append((index, faceorder, f'''\n@font-face {{
    font-family: "{family}";
    font-style: {style};
    font-weight: {weight};
    font-display: swap;
    src: url("/assets/fonts/{filename}?v={outputs[filename][:12]}") format("woff2");
    unicode-range: {unicode_range};
}}'''))
                    if index == 0:
                        first_size = size
                declared_ranges.sort()
                assert all(left[1] < right[0] for left, right in zip(declared_ranges, declared_ranges[1:])), name
                assert covered == set(original_cmap), name
                print(f"{name}: {len(chunks)} subsets, {total} bytes, first {first_size} bytes; {len(covered)} codepoints and metrics verified", flush=True)
        css_text = "/* Generated by scripts/convert-fonts.py; see assets/fonts/PROVENANCE.md. */\n" + "\n".join(rule for _, _, rule in sorted(css_records)) + "\n"
        sums = "".join(f"{outputs[name]}  {name}\n" for name in sorted(outputs))
        if args.check:
            assert CSS.read_text() == css_text, "Generated CSS differs"
            assert (DESTINATION / "SHA256SUMS").read_text() == sums, "Subset checksums differ"
        else:
            for name in outputs:
                (directory / name).replace(DESTINATION / name)
            for old in DESTINATION.glob("*.woff2"):
                if old.name not in outputs:
                    old.unlink()
            CSS.write_text(css_text)
            (DESTINATION / "SHA256SUMS").write_text(sums)


if __name__ == "__main__":
    main()
