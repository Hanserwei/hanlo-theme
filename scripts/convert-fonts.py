#!/usr/bin/env python3
"""Losslessly wrap pinned upstream TTFs in WOFF2; no subsetting or renaming.

Requires fonttools[woff]==4.64.0 and brotli==1.2.0. See the bundled
public/assets/fonts/PROVENANCE.md for downloads and license information.
Usage: python3 scripts/convert-fonts.py /path/to/extracted/upstream/fonts
"""

import argparse
import hashlib
from pathlib import Path

from fontTools.ttLib import TTFont


FONTS = {
    "MapleMono-NF-CN-Regular": "bb8e8e8c263896f42555107202f1847f7a42c340a3e532df9c4d585c9794411c",
    "MapleMono-NF-CN-Bold": "9e0c22a032c255b2da2c073d6cca6f8cf6fd6f214ae5407eb9f1aa523713729b",
    "MapleMono-NF-CN-Italic": "39e6c6e611e65e6d0780f6279561f954f9db51221987d0924c45f6121eaf9054",
    "MapleMono-NF-CN-BoldItalic": "9d6e76fbb5767406efd1f5ae2d32f5439de3b4d4063b128e4186ad5619267120",
    "LXGWWenKai-Regular": "39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009",
    "LXGWWenKai-Medium": "d4bdeb38a39151d74d084cba5090f8cb7d20bf83eedb78c35939ae70b9f4e3f6",
}
ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / "public/assets/fonts"


def validate(source, output):
    """Compare coverage, glyph order, metrics, outlines, hinting and layout tables."""
    with TTFont(source, recalcTimestamp=False) as original, TTFont(output) as converted:
        cmap = converted.getBestCmap()
        assert cmap is not None and original.reader is not None, output
        assert original.getBestCmap() == cmap, output
        assert original.getGlyphOrder() == converted.getGlyphOrder(), output
        assert set(original.keys()) == set(converted.keys()), output
        # WOFF2 normalizes glyf/loca packing and the head checksum adjustment.
        # Compare decoded outlines instead; every other table remains byte-identical.
        for tag in original.reader.keys():
            if tag not in {"head", "glyf", "loca"}:
                assert original.getTableData(tag) == converted.getTableData(tag), (output, tag)
        for name in original.getGlyphOrder():
            before, after = original["glyf"][name], converted["glyf"][name]
            assert before == after, (output, name)
        for character in "中文漢字":
            assert ord(character) in cmap, (output, character)
        if source.name.startswith("Maple"):
            assert converted["name"].getDebugName(1) == "Maple Mono NF CN", output
            features = converted["GSUB"].table.FeatureList.FeatureRecord
            assert any(feature.FeatureTag == "calt" for feature in features), output
            for codepoint in (0xE0B0, 0xF120, 0xF0001):
                assert codepoint in cmap, (output, codepoint)
        print(f"{output.name}: {len(cmap)} codepoints; "
              f"{len(converted.getGlyphOrder())} glyphs; outlines/tables preserved", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--check", action="store_true", help="validate existing WOFF2 without writing")
    arguments = parser.parse_args()
    # Check every input before writing any output.
    for name, checksum in FONTS.items():
        source = arguments.source / f"{name}.ttf"
        if hashlib.sha256(source.read_bytes()).hexdigest() != checksum:
            raise ValueError(f"Unexpected upstream checksum: {source}")
    if not arguments.check:
        DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in FONTS:
        source = arguments.source / f"{name}.ttf"
        output = DESTINATION / f"{name}.woff2"
        if not arguments.check:
            with TTFont(source, recalcTimestamp=False) as font:
                font.flavor = "woff2"
                font.save(output)
        validate(source, output)


if __name__ == "__main__":
    main()
