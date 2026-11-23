# Public 3D previews only

This directory is intentionally public. **Never upload an original `.vrm` here** or anywhere in this public repository. Do not upload full-size textures, rigged model exports, or files with private data.

Upload only the deliberately simplified static `.glb` assets produced by the local preview conversion workflow. Every file in this folder can be downloaded by anyone even when the viewer hides direct download controls.

## Aino test

The viewer catalogue already lists `previews/aino-preview.glb`. To activate it, upload the separately prepared **aino-preview.glb** into this directory on GitHub (Add file → Upload files). Once GitHub Pages deploys, reloading `viewer.html` should show the preview model.

The Aino test preview was reduced from 118,960 triangles to 20,258 (about 83% fewer); 256 pixels is the maximum texture dimension. The VRM rig, morph targets, animations and VRM extension metadata are absent. It is intentionally **not** a high-fidelity original. Keep the original on your own computer or another private, access-controlled storage provider.

The file was produced from the user's original VRM using the local `make_vrm_preview.py` conversion script (Python, trimesh, VTK and Pillow). Always inspect the exported GLB before publication.

Do not re-add public GitHub Release assets of the original models. Remove the original Aino `.vrm` attachment from the existing public release separately: removing links in the viewer does not revoke public GitHub downloads.
