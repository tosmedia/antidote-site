# Antidote — landing page

Single-page site for Antidote, a video file repair service. Plain HTML, CSS and
JavaScript — no framework, no build step required to run it. Open `index.html`
in a browser, or drop the whole folder on any static host.

## Files

```
index.html            the page
assets/styles.css     design system + all styling
assets/app.js         theme toggle, hero clip + slider, file inspector, reveals
assets/favicon.svg    brand mark
build.js              optional — bundles everything into one file
dist/antidote.html    the same page as one self-contained file
privacy.html          privacy policy (Armenian law + GDPR), draft for legal review
assets/doc.js         theme toggle for the legal pages
assets/img/           photographs — see below
```

Run `node build.js` after editing to refresh `dist/`.

## Design system

| Token | Dark (default) | Light |
|---|---|---|
| ground | `#0A1113` | `#F1F5F3` |
| accent | `#F2A03F` sodium amber | `#B4670C` |
| damage | `#FF2E6E` macroblock magenta | `#C81E52` |

Type: **Archivo** (display, expanded width axis) · **IBM Plex Sans** (body) ·
**IBM Plex Mono** (data, labels, timecode). All served from Google Fonts.

Dark is the default. The toggle in the header writes the choice to
`localStorage` under `antidote-theme`.

## Photographs

Three photos belong in `assets/img/` under these exact names:

```
hero-frame.jpg    16:9  coastal road at dusk — becomes the "repaired" side of the hero clip
desk-camera.jpg   4:3   cinema camera, SSD, memory card, dead battery on a table — Failure modes section
night-desk.jpg    3:2   desk at night with scopes and a hex dump — Team section
```

The page works without them: a missing photo hides its figure, and the hero
falls back to the procedural seascape. `node build.js` inlines whatever is
present into `dist/` as data URIs.

## Two things worth knowing

**The hero is a clip that plays, and there is no video file.** Both sides are
drawn on canvas at 25p. `renderScene()` paints a dusk seascape — drifting cloud,
a sun breathing on the horizon, a moving glitter column, sensor grain and a slow
handheld float. `renderBroken()` then takes that exact frame apart the way a
damaged H.264 stream falls apart, with fresh damage every frame: row tearing,
16px macroblocks copied from the wrong place, a region where resolution
collapses, chroma torn off its luma, dead magenta and green blocks, and an
unwritten tail. Every fourteenth frame or so the broken side simply stops
updating while the clean side keeps moving — a frozen picture is what a missing
index actually looks like.

It costs almost nothing: the static parts (sky, sea, cloud strip, vignette, four
grain tiles) are pre-rendered once per theme, and every per-frame operation is a
`drawImage` or a `fillRect` — no pixel loops. Playback stops when the tab is
hidden or the hero scrolls out of view, `prefers-reduced-motion` starts it
paused, and the button in the player chrome pauses it by hand.

**The drop zone really inspects the file.** The inspector reads a few small
slices in the browser and recognises the container from its signature:

- **MP4 / MOV / M4V / 3GP** — walks the top-level atoms, reports the `ftyp`
  brand, `mdat` (frames) and `moov` (index), and counts stream start codes in
  the first 256 KB of picture data. Frames-without-index is the most common
  recoverable failure, so the page says so plainly rather than pitching.
- **MXF** — partition-pack key.
- **AVI** — RIFF header, and whether its declared size matches the file.
- **MKV / WebM** — EBML header.
- **MTS / M2TS / TS** — sync-byte alignment at 188 or 192 bytes.
- **MPG / VOB** — pack header.

The file never leaves the page; the button then opens a prefilled mail draft.

**Confidentiality angle.** The repair runs on the customer's machine against
the original file; the engine that drives it lives on Antidote's servers. The
copy leans on that: nothing to upload, nothing of theirs held. The block also
promises the diagnosis sample is deleted when the job closes — confirm that
matches practice.

## Before this goes live — replace

1. `repair@your-domain.com` — in `index.html` (footer, two links) and at the top
   of the file-inspection block in `assets/app.js` (`var CONTACT`).
2. The one-line role descriptions in the **Team** section — the names and titles are
   real, the sentences under them are written copy and yours to change.
3. **The three quotes in the "From the field" section.** They are visibly marked
   as placeholders. Put real, attributable customer quotes there or delete the
   section — do not ship invented testimonials.
4. The "diagnosis sample deleted when the job closes" line in the
   Confidentiality block, if that is not your actual policy.
5. Privacy / Terms / Security links in the footer currently point at `#`.
6. `privacy.html`: every `[bracketed]` item (entity name, address, registration
   number, providers, server location, retention periods, contact address), and a
   review by a lawyer admitted in Armenia before it goes live.
7. Prices: `$49` appears in the Release step, the pricing table and the FAQ.
8. The format and brand lists in the **Formats** section — trim to what you
   actually take on.

## License

MIT — see `LICENSE`.
