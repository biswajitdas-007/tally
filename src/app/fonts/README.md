# Fonts

Self-hosted so `next build` never depends on fetching from Google Fonts.

| File | Family | Notes |
|---|---|---|
| `instrument-sans-variable.woff2` | Instrument Sans | Variable weight 400–700 (width axis pinned to 100) |
| `instrument-serif-regular.woff2` | Instrument Serif | 400 normal |
| `instrument-serif-italic.woff2` | Instrument Serif | 400 italic — headline accents |

Source: the official OFL files in [google/fonts](https://github.com/google/fonts) (`ofl/instrumentsans`, `ofl/instrumentserif`), subset to Latin and Latin Extended with `fonttools` (the serif files use the same `pyftsubset` command without the instancer step):

```sh
fonttools varLib.instancer "InstrumentSans[wdth,wght].ttf" wdth=100 -o sans.ttf
pyftsubset sans.ttf --unicodes="U+0000-00FF,U+0100-024F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02C7,U+02D8-02DD,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features='*' --flavor=woff2 --output-file=instrument-sans-variable.woff2
```

`og/` holds static TTF subsets (Sans Bold, Serif Italic; printable Latin only) for the Open Graph image, because `ImageResponse` can't read woff2. They carry no OpenType layout features: the image renderer mis-applies GPOS kerning around spaces.


```sh
fonttools varLib.instancer "InstrumentSans[wdth,wght].ttf" wdth=100 wght=700 -o sans-700.ttf
pyftsubset sans-700.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+20AC,U+2122" --layout-features='' --no-layout-closure --output-file=og/instrument-sans-bold.ttf
```

Neither family has a ₹ glyph; it falls back to the system font, like other UI text.

Both families are licensed under the SIL Open Font License 1.1 — see `OFL-InstrumentSans.txt` and `OFL-InstrumentSerif.txt`. Neither declares a Reserved Font Name.
