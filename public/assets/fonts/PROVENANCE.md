# Bundled text and code fonts

These assets are self-hosted by Hanlo. Text uses **LXGW WenKai** (the original proportional family, not WenKai Mono, Lite or a screen-specific fork). Code uses **Maple Mono NF CN** (the default ligature family with Chinese and Nerd Font glyphs, not Maple Mono, NF-only, Normal, or NL).

## Pinned upstream sources

| Family | Release / source commit | Official downloads | Included faces |
| --- | --- | --- | --- |
| Maple Mono NF CN | [v7.9](https://github.com/subframe7536/maple-font/releases/tag/v7.9), `4d847729cbfc5b5d8cbae5795fd2348c70112648` | [MapleMono-NF-CN.zip](https://github.com/subframe7536/maple-font/releases/download/v7.9/MapleMono-NF-CN.zip), [upstream SHA-256](https://github.com/subframe7536/maple-font/releases/download/v7.9/MapleMono-NF-CN.sha256) | Regular 400, Bold 700, Italic 400, Bold Italic 700 |
| LXGW WenKai | [v1.522](https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522), `e8b5b48b79f19f29aa68b0a178eab3472ea9f7e8` | [Regular TTF](https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf), [Medium TTF](https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Medium.ttf) | Regular 400, Medium 500 |

The Maple archive SHA-256 is `af913b6322905348b3f50e4397fedc35b3a880db5effcce7969003051dcd3e94`, verified against the upstream checksum. Its original `config.json` is preserved as `MapleMono-upstream-config.json`: `use_hinted: true`, `ligature: true`, Nerd Fonts `3.4.0` with complete glyphs and default icon widths. Chinese outlines are upstream's Resource Han Rounded integration. The hinted upstream build omits infinite-arrow ligatures by design; its standard programming ligatures remain enabled through `calt`.

Internal font versions are `Version 7.900` and `Version 1.522; March 17, 2026`. WenKai Medium's internal family name is `LXGW WenKai Medium`; the CSS registers this original face at its actual weight 500 under the shared `LXGW WenKai` family. Browser font matching/synthesis supplies other WenKai weights and italics; no separate upstream Bold or Italic face is claimed.

## License and conversion

- `MapleMono-OFL.txt` is the unmodified `LICENSE.txt` from the pinned Maple release archive, copyright the Maple Mono Project Authors, SIL OFL 1.1.
- `LXGWWenKai-OFL.txt` is the unmodified [v1.522 OFL.txt](https://raw.githubusercontent.com/lxgw/LxgwWenKai/e8b5b48b79f19f29aa68b0a178eab3472ea9f7e8/OFL.txt), including both LXGW and Klee Project copyright notices, SIL OFL 1.1.
- `NerdFonts-LICENSE.txt` additionally preserves [Nerd Fonts v3.4.0 licensing](https://raw.githubusercontent.com/ryanoasis/nerd-fonts/v3.4.0/LICENSE) for the embedded Nerd glyph integration.

The conversion uses FontTools 4.68.0 and Brotli 1.2.1 to generate WOFF2 subsets, retaining the original font names, license metadata, glyph metrics, hinting, and layout features with FontTools' GSUB/GPOS closure. Subsetting removes glyphs and tables that are not needed by a given shard; collectively the shards retain every Unicode character mapped by each upstream face. These assets remain under their upstream licenses, separate from the theme's software license. The supplied Maple and WenKai OFL notices declare no Reserved Font Names.

To reproduce, download the pinned inputs above, extract the four named Maple TTF faces into the same directory as the two WenKai TTFs, then run from the repository root:

```sh
python3 -m venv /tmp/hanlo-font-tools
/tmp/hanlo-font-tools/bin/pip install 'fonttools[woff]==4.68.0' 'brotli==1.2.1'
/tmp/hanlo-font-tools/bin/python scripts/convert-fonts.py /path/to/upstream-inputs
/tmp/hanlo-font-tools/bin/python scripts/convert-fonts.py /path/to/upstream-inputs --check
```

The generator authenticates all six inputs against the pinned SHA-256 values before writing. It also accepts the previously distributed complete WOFF2 files with `--woff2-input`, authenticated against their original checksums; these are an alternative input and are not distributed with the shards. `--check` verifies existing shard coverage, horizontal and vertical glyph metrics, name and hinting tables, key Maple glyph and ligature outlines, contextual substitution and output checksums against the authenticated inputs, as well as the generated CSS. `SHA256SUMS` records the distributed shard checksums. Different input containers or FontTools/Brotli versions may produce different compressed bytes.

## Loading and coverage

`src/css/components/fonts.css` is generated alongside the font files and registers each shard using `unicode-range`, `font-display: swap`, and a content-hash query for cache invalidation. Vite resolves these public asset URLs using the theme base path. No third-party font host, `local()` face substitution, eager font preload or runtime font setting is used. Browsers fetch the shards needed for displayed characters and cache them; system generic families are transient or missing-character fallbacks.

Each first shard contains mapped characters below U+3400 (including Latin combining marks, Greek, Cyrillic, punctuation and kana), fullwidth punctuation, and the GB2312 level-one Chinese characters. The remaining mapped characters are sorted into groups of up to 2,048. CSS ranges may include gaps with no mapped characters, but never include a character assigned to another shard. The union of each face's shards retains its entire upstream Unicode repertoire, including Nerd icons. ASCII programming characters share the first Maple shard so their contextual ligatures can operate together. Layout substitutions spanning characters in different shards can be limited by browser font shaping across font faces.

Code, preformatted text, keyboard notation and sample output use Maple with `font-variant-ligatures: common-ligatures contextual`, `font-feature-settings: "calt" 1, "liga" 1` and normal letter spacing. Existing Shiki, inline code and keyboard font overrides use the same token. Icon-specific haofont and Font Awesome declarations remain intact. Old saved `style.fontFamily` values have no source consumer and the obsolete setting has been removed. DPlayer's host inherits the text face, but its injected unlayered Balloon tooltip stylesheet retains its own font declarations; third-party injected/isolated widget styles are outside these theme font overrides.
