# File format compatibility

LayerLibrary reads file formats, not printer brands. A printer name does not guarantee that every project or sliced file from its software will work. No claim of universal vendor compatibility is made.

| Format | Available support | Limits |
| --- | --- | --- |
| STL | Binary and ASCII triangle meshes; generated thumbnail and 3D view | No embedded project settings; STL has no units |
| 3MF | Core meshes, build transforms, components, external production model parts; embedded pictures and selected metadata | Geometry only for many extensions; no guarantee for painted materials, vendor settings, toolpaths, ZIP64 metadata or all slicer variants |
| OBJ | Mesh geometry and faces | No separate MTL or texture import |
| PLY | Polygon meshes supported by the bundled loader | Point clouds are not supported |
| AMF | Geometry through the bundled Three.js loader | Not a complete reconstruction of every AMF feature |
| STEP / STP, X3D, GLTF / GLB | Not supported | Export a supported mesh from the source application |
| G-code / BG-code / printer toolpaths | Not supported | These are sliced instructions rather than the original model |
| CTB, Photon, Goo, Chitubox and other proprietary resin/project files | Not supported | Export STL or another supported model format in the original application |

Unsupported files are counted in the import report. A filename extension alone is not evidence of a valid mesh. Metadata import can succeed while geometry parsing fails; the project view displays geometry errors.

## Evidence and vendor context

Official documentation checked on 2026-10-25:

- [PrusaSlicer input/output documentation](https://help.prusa3d.com/product/prusaslicer/input-output_209) lists 3MF and binary/ASCII STL. Standard model exports are the appropriate input; this does not validate every Prusa project.
- [Bambu Studio command-line documentation](https://github.com/bambulab/BambuStudio/wiki/Command-Line-Usage) describes 3MF and STL inputs. LayerLibrary has automated coverage for external-part 3MF structures, but does not reproduce every Bambu setting or material.
- [UltiMaker Cura file formats](https://support.ultimaker.com/articles/Knowledge/1667411286871) include 3MF, STL, PLY, OBJ and X3D. LayerLibrary supports the first four model formats; it does not support X3D or reconstruct all Cura project settings.
- [CHITUBOX documentation](https://docs.chitubox.com/en-US/chitubox/latest/introduction) distinguishes model, project and sliced printer formats. LayerLibrary's model readers do not imply support for CTB, Photon, Goo or other printer output files.

Other slicers may export standard files that work, but should not be labelled certified or fully supported without representative file testing.

## Release validation

Automated tests exercise the bundled parser with generated binary/ASCII STL, OBJ, ASCII PLY, AMF, core 3MF, transformed 3MF components, and external production parts. These original synthetic fixtures establish parser behavior, not exhaustive vendor compatibility. The original Layer Tower mesh is checked for a closed surface, consistent edge winding and nonzero triangle area.

Before a stable release, test representative user-owned exports from the slicers you intend to name as tested. Record slicer version, file type, metadata result and geometry result. Do not publish those files unless their licenses permit it. A real-browser test on each target OS is still required for WebGL, folder drops, download/reopen and optional deletion permissions.
