# ICO Export Pro

A Figma plugin that exports frames as Windows `.ico` files. Each selected frame becomes a single multi-size ICO — ready to use as a `favicon.ico` or a Windows application icon.

## Features

- **One `.ico` per frame, all sizes embedded** — exactly how the ICO format is meant to be used: the OS or browser picks the best resolution from a single file.
- **Crisp at every size** — each size is rendered by Figma from the vector source, not scaled from a single bitmap.
- **Batch export** — select any number of frames, components, or instances and export them all at once. Multiple files are packaged into a ZIP named after your Figma document.
- **Size presets** — Desktop (16–256), Web favicon (16–256), or a custom comma-separated list.
- **Live preview** — toggle a preview panel that follows the selected frame.
- **Native look & feel** — built with Figma's design tokens; follows the editor's light/dark theme automatically.
- **No network access** — everything runs locally; the manifest declares `networkAccess: none`.

## Installation (development build)

1. Clone or download this repository.
2. In the Figma desktop app, open any file and go to
   **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` from this folder.
4. Run it from **Plugins → Development → ICO Export Pro**.

No build step is required — the plugin is plain JavaScript, HTML, and CSS with zero dependencies.

## Usage

1. Select one or more **frames, components, or instances**. Square frames work best; non-square frames are letterboxed on a transparent background.
2. Pick a size preset, or choose **Custom** and enter sizes in pixels (comma separated, `1–256`).
3. Optionally enable **Preview** to inspect frames before exporting.
4. Click **Export**:
   - a single frame downloads directly as `FrameName.ico`;
   - multiple frames download as `DocumentName_icons.zip`.

### Recommended sizes

| Use case | Sizes |
|---|---|
| Website favicon | 16, 32, 48 (optionally 64, 256) |
| Windows app icon | 16, 24, 32, 48, 64, 128, 256 |

## Output format details

- Entries up to 255 px are stored as 32-bit BGRA bitmaps with alpha channel (maximum compatibility, including older Windows versions).
- 256 px entries are stored as embedded PNG, per the Windows Vista+ convention, which keeps file size down.
- **256 px is the hard upper limit of the ICO format** (width/height are stored in a single byte); the plugin enforces it. If you need larger raster icons, export PNG from Figma directly.

## Project structure

```
manifest.json   Plugin manifest (editor type, document access, network policy)
code.js         Sandbox side: selection tracking, per-size PNG rendering via exportAsync
ui.html         UI side: interface, ICO encoding, ZIP packaging, downloads
```

The two sides communicate via `postMessage`. PNG rendering happens in the Figma sandbox; ICO/ZIP encoding happens in the UI iframe using the Canvas API and hand-written binary encoders (including CRC-32 for the ZIP).

## Limitations

- ICO output only — no standalone PNG/ICNS export.
- Very large batches (dozens of frames × many sizes) are processed sequentially and may take a while; progress is shown per frame and per size.
- Frame names are sanitized for use as filenames; characters outside letters, numbers, spaces, `_` and `-` are replaced.
