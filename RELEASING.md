# Publishing LayerLibrary

Suggested repository name: **LayerLibrary**

Repository description:

> Free offline 3MF, STL, OBJ, PLY & AMF viewer and 3D printing model library. One portable HTML file with folder categories, 3D previews and duplicate detection. No install or uploads.

Suggested GitHub topics:

`3mf`, `stl`, `stl-viewer`, `3mf-viewer`, `3d-printing`, `3d-viewer`, `model-library`, `offline`, `portable`, `threejs`, `obj`, `ply`, `amf`, `open-source`

## Build and package

```sh
npm ci
npm run build:engine
npm run build
npm test
python3 scripts/package_source.py
```

Upload `dist/LayerLibrary.zip` as the end-user download. It contains the single HTML, MIT notice, instructions and an original STL sample. `dist/LayerLibrary Source.zip` contains the source selected by an explicit allowlist. An optional empty version can be built with `python3 scripts/build.py --empty --output dist/LayerLibrary-Empty.html`.

Do not upload the entire working folder or all of `dist`: older demo HTML/ZIP files may embed private or third-party models. Use the newly built public ZIP only. The old whistle demo is not part of the public package.

## Before marking stable

- Open the extracted HTML directly on Windows, macOS and Linux; record browser versions.
- Check the built-in STL thumbnail and rotate/zoom/pan controls.
- Drop a folder with nested categories and several formats; check the unsupported-file report.
- Save a named filtered library, close the tab, and reopen that downloaded HTML.
- Test exact duplicates and deletion only with disposable copies; verify denied permissions leave originals intact.
- Try real 3MF exports from each slicer you wish to advertise as tested. Keep unsupported formats explicit in COMPATIBILITY.md.
- Capture a real screenshot of the demo for the repository README after visual verification.

Use a preview release label until these manual checks are recorded. Automated parser tests do not establish cross-platform browser compatibility.

## Licensing

The software, original Layer Tower model and generator are MIT licensed. Anyone may use, copy, modify, redistribute, sublicense or sell them with the required license notice. The project itself is offered free. Third-party dependency notices remain included. External user models retain their own licenses.

No repository URL or owner is assumed here; add the real URL after creating the repository.
