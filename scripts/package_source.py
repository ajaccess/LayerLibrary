#!/usr/bin/env python3
"""Package only reviewed public source paths, never arbitrary working files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parent.parent
FILES = [
    '.gitignore', '.github/workflows/check.yml', 'README.md', 'LICENSE',
    'CONTRIBUTING.md', 'CHANGELOG.md', 'COMPATIBILITY.md', 'RELEASING.md', 'USAGE.md',
    'package.json', 'package-lock.json', 'viewer-3d.js',
    'src/index.html', 'src/app.js', 'scripts/build.py', 'scripts/make_sample.py',
    'scripts/package_source.py', 'tests/library.test.cjs', 'tests/formats.test.cjs',
    'examples/Layer Tower.stl', 'examples/README.md',
    'vendor/mesh-viewer.js', 'vendor/THREE-LICENSE.txt', 'vendor/FFLATE-LICENSE.txt',
]
output = ROOT / 'dist/LayerLibrary Source.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in FILES:
        archive.write(ROOT / name, 'LayerLibrary/' + name)
print(f'Packaged {len(FILES)} public source files: {output.name}')
