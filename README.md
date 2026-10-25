# LayerLibrary — Free 3MF & STL Viewer

Free, open-source offline **3MF, STL, OBJ, PLY and AMF viewer** and 3D printing model library. One HTML file, your folders, and a browser. No subscription or account.

LayerLibrary runs locally without installation, a server, an account, or an internet connection. Drop a folder to browse its models, embedded pictures, and project information. Subfolders become categories.

## Download

[Download LayerLibrary ZIP](../../releases/download/v0.3.0-preview/LayerLibrary.zip) · [Browse releases](../../releases)

Choose **LayerLibrary.zip** under release Assets, extract it, and open **LayerLibrary.html**. GitHub's automatically generated “Source code” archives are for contributors; the release ZIP is the ready-to-use app.

The first release is a preview: automated checks pass, while broader browser and real slicer compatibility testing is still pending.

## Use it

[Full usage guide](USAGE.md)

1. Extract the release ZIP and open `LayerLibrary.html` in a modern desktop browser.
2. Try the built-in original **Layer Tower STL** demo, then drag your project folder onto the page, or choose **Add files**.
3. Choose **Add** or **Replace**. For matching relative filenames, keep both, replace the library copy, or skip the incoming copy.
4. Search, filter by folder or format, and open a project to rotate its model.
5. Use **Save portable library** to download one HTML containing all projects, the selected folder, or your filtered results across every page.

Files sitting beside the HTML cannot be discovered automatically: browsers require you to select or drop them. Importing reads files into memory; it does not move originals or create temporary model files. Saving a library deliberately embeds copies in a new HTML.

## Features

- 3MF, STL, OBJ, PLY, and AMF; embedded 3MF pictures and available metadata.
- Interactive mesh rotation, zoom, pan, reset, and wireframe.
- On-demand model thumbnails generated in memory.
- Subfolder categories, search, format filters, sorting, and 25/50 projects per page.
- Light/dark appearance, import progress and cancellation, per-file error reports.
- Exact duplicate detection based on file bytes.
- Optional deletion of originals, with explicit permission, confirmation, and a fresh content check.
- Named portable exports with estimated size and selectable scope.

## Privacy and deletion

No uploads, analytics, cookies, local storage, IndexedDB, or service worker. Session references are released on page exit. Settings reset when reopened. The browser manages its own history, memory, downloads, and permission records; the app does not erase those.

Removing an item from the library changes the session only and supports Undo. **Delete original file** changes the disk file and has no Undo; it may bypass the system Trash. It requires a browser with folder-write support and your permission. If unsupported, the app says so; use your file manager. Deleting an original does not remove copies from previously saved HTML libraries.

## Compatibility and limits

The portable HTML is intended for modern desktop browsers on Windows, macOS, and Linux. Browser filesystem permissions and directory drag/drop support vary. WebGL is required for 3D rendering. Automated tests simulate the DOM and filesystem; they do not replace testing a downloaded HTML in your browser.

A 3MF contains mesh data, not necessarily STL files. Vendor metadata and preview conventions vary. Geometry is a preview, not a slicer or printability check. Painted colors, textures, toolpaths, and some vendor extensions may not appear. OBJ sidecar materials/textures are not imported. G-code, STEP, proprietary slicer containers, and resin slice formats are not supported.

Preview limits include 128 MB per model, 192 MB of extracted 3MF model XML, and 3 million triangles. Portable export is limited to 256 MB of source model files and expands their size by roughly one third for embedding. Large libraries also consume browser memory. Cancellation takes effect between files; a current parsing operation may finish first.

## Development

End users need no development tools. Contributors need Node.js 22+ and Python 3.9+.

```sh
npm ci
npm run build:engine
npm run build
npm test
```

The output is `dist/LayerLibrary.html` and `dist/LayerLibrary.zip`. The checked-in engine bundle lets you build the HTML with only `python3 scripts/build.py`. Main UI sources are `src/index.html` and `src/app.js`; the renderer source is `viewer-3d.js`.

The app and its original sample are free for personal and commercial use under MIT. See [format compatibility](COMPATIBILITY.md) for supported file structures and known gaps. See [release instructions](RELEASING.md) for GitHub description, topics, packaging and manual checks.

Optional private demo build:

```sh
python3 scripts/build.py --demo /path/to/your-model.3mf --output "dist/LayerLibrary Demo.html"
```

Public builds include only our original MIT-licensed **Layer Tower** sample. Its generator and STL are in the source repository. Do not commit personal libraries, third-party models, or private exports. `dist` outputs and other model files are ignored by Git. An empty build is available with `python3 scripts/build.py --empty --output dist/LayerLibrary-Empty.html`. Before a release, test drag/drop, 3D rendering, portable save/reopen, and permission-based deletion using disposable fixtures on the target browsers.

## License

MIT: use, modify, distribute, or sell LayerLibrary while retaining its license notice. Three.js and fflate are also MIT licensed; their notices are preserved in the HTML and `vendor/`. Model files retain their own copyright and licenses. The app license grants no rights to third-party models.
