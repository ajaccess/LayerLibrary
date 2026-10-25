# Using LayerLibrary

## Download and open

Download **LayerLibrary.zip** from the GitHub release's Assets section. Extract the ZIP, then double-click **LayerLibrary.html**. If asked which application to use, choose your browser. You do not need to install anything or run a server.

The built-in Layer Tower sample lets you try the 3D viewer immediately.

## Add your projects

Drag a folder onto the page, including any subfolders. Alternatively choose **Add files** to select model files. Supported extensions are `.3mf`, `.stl`, `.obj`, `.ply`, and `.amf`.

Choose **Add** to keep the current library or **Replace** to start with the new files. These options change the library view, not your original files. For matching filenames, choose keep both, replace the library copy, or skip.

Files placed next to the HTML do not load automatically. Drop them onto the page.

## Browse and preview

Select a folder category or **All projects**. Turn **Include subfolders** on to include deeper folders. Search by name, filter by format, sort, or show 25/50 projects per page.

Click a project to see its details and 3D model. Drag to rotate, scroll to zoom, and right-drag to pan. Click outside the project dialog to close it. Available embedded pictures and printer settings depend on the source file.

## Save your library

Choose **Save portable library**, enter a name, and select all projects, the current folder, or current search/filter results. The downloaded HTML includes copies of those models. Open it next time to reload them.

Closing the tab discards unsaved session data. The app does not save cookies or browser preferences. Downloads and saved HTML files remain on your disk.

## Duplicates and deletion

**Find duplicates** compares file contents. Removing an item from the library does not delete the original and supports Undo.

**Delete original file** is separate: it requires folder-write support, your permission, and confirmation. It may bypass the system Trash and cannot be undone in the app. If your browser does not support it, use your file manager.

## If something does not open

Read the import report or project error message. Proprietary printer files, sliced resin files, G-code, STEP, and point-cloud PLY are not supported. Export a supported mesh from the original slicer/CAD application. A 3D preview requires WebGL support. Very large models can exceed preview or browser memory limits.

This is a public preview; see COMPATIBILITY.md in the repository for the current test coverage and limitations.

## Free and open source

The app and original Layer Tower sample are MIT licensed. You may use, copy, modify, share and sell them while retaining the license notice. Models you add keep their own licenses; only share models you have permission to distribute.
