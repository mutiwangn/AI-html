# AIHTML Display title subset

- Source: atelierAnchor's official Smiley Sans repository and release v2.0.1.
- Release: https://github.com/atelier-anchor/smiley-sans/releases/tag/v2.0.1
- Downloaded archive: https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip
- Source face: `SmileySans-Oblique.ttf`.
- License: SIL Open Font License 1.1, reproduced verbatim in `OFL.txt` (official LICENSE blob `d4511630b94994b2b3eb0c99cec1a11cac804004`).
- Subset characters: `教科版-小学科学-交互课件` (10 unique Unicode characters).
- The subset is a modified version, so its primary name records were renamed `AIHTML Display` / `AIHTML Display Oblique` / `AIHTMLDisplay-Oblique`, avoiding the reserved names `Smiley` and `得意黑`.
- Use the font only for the site title; body text should retain the system sans-serif stack. The original font's authors do not recommend it for body typography.
- The distribution file is WOFF, 3,188 bytes. WOFF2 was not generated because the current runtime lacks the Brotli Python extension; no software was installed.
- Keep `OFL.txt` with any redistributed subset, and do not apply the repository's own license to this font.

Suggested CSS:

```css
@font-face {
  font-family: "AIHTML Display";
  src: url("./fonts/aihtml-display.woff") format("woff");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
.site-title {
  font-family: "AIHTML Display", "Microsoft YaHei", sans-serif;
  font-style: normal;
  font-weight: 400;
  font-synthesis: none;
}
```

The face's glyphs already have the intended slant; no additional CSS skew or italic synthesis is needed.
