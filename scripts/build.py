#!/usr/bin/env python3
"""Build a self-contained HTML; the public build includes only our original MIT-licensed sample."""
import argparse
import base64
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DEMO = ROOT / 'examples/Layer Tower.stl'

def build(output, demo=DEFAULT_DEMO):
    template = (ROOT / 'src/index.html').read_text()
    for marker, source in [('/* MESH_ENGINE */', 'vendor/mesh-viewer.js'), ('/* APP_SOURCE */', 'src/app.js')]:
        code = (ROOT / source).read_text().replace('</script', '<\\/script')
        template = template.replace(marker, code)
    template = template.replace('<head>', '<head>\n<!--\n' + (ROOT / 'LICENSE').read_text() + '\n-->')
    if demo:
        record = {'path': demo.name, 'name': demo.name, 'modified': 1792886400000 if demo.resolve() == DEFAULT_DEMO.resolve() else int(demo.stat().st_mtime * 1000),
                  'data': base64.b64encode(demo.read_bytes()).decode()}
        snapshot = json.dumps({'version': 1, 'name': 'LayerLibrary', 'sample': True, 'files': [record]}).replace('<', '\\u003c')
        template = template.replace('<script id="saved-library" type="application/json"></script>',
                                    '<script id="saved-library" type="application/json">' + snapshot + '</script>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(template)
    with zipfile.ZipFile(output.with_suffix('.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(output, output.name)
        archive.write(ROOT / 'LICENSE', 'LICENSE.txt')
        archive.write(ROOT / 'USAGE.md', 'HOW TO USE.md')
        if demo and demo.resolve() == DEFAULT_DEMO.resolve():
            archive.write(demo, 'examples/' + demo.name)
            archive.write(ROOT / 'examples/README.md', 'examples/README.md')
        archive.writestr('START HERE.txt', 'LayerLibrary\n\nExtract this ZIP, then double-click ' + output.name + '.\nNo installation or server is needed. Drop your model folder onto the page.\nChoose Add or Replace, then browse your projects. Save portable library\ndownloads a new HTML containing your selected projects.\n\nNothing is uploaded. Closing the tab discards session data.\nOriginal deletion is optional, requires browser support and explicit permission,\nand may bypass the Trash.\n' + ('\nIncludes the original MIT-licensed Layer Tower sample. You may use, modify,\nand share it under the included license.\n' if demo and demo.resolve() == DEFAULT_DEMO.resolve() else ('\nCustom demo: check model redistribution rights before sharing.\n' if demo else '')))
    print(f'{output}: {output.stat().st_size:,} bytes')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/LayerLibrary.html')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--demo', type=Path, default=DEFAULT_DEMO)
    group.add_argument('--empty', action='store_true', help='Build without the bundled sample')
    args = parser.parse_args()
    build(args.output, None if args.empty else args.demo)
