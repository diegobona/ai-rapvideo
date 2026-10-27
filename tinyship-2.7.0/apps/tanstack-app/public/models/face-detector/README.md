# Browser face detector assets

These assets support local detection and cropping of the two people in a duo
photo. The uploaded photo is processed in the visitor's browser; these files
do not send that photo to Google.

## Runtime

- Package: `@mediapipe/tasks-vision@1.1.1` (exact version in package.json and
  pnpm-lock.yaml).
- Runtime files: all six files from the package's `wasm/` directory, including
  the SIMD, non-SIMD, and ES-module variants. Keep them in sync with the package.
- Runtime base path passed to `FilesetResolver.forVisionTasks`:
  `/models/face-detector`.
- Upstream: <https://github.com/google-ai-edge/mediapipe>.
- License: Apache-2.0; see `LICENSE`.

## Model

- File: `model.tflite`.
- Model: MediaPipe BlazeFace short range, float16, version 1.
- Official download:
  <https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite>.
- Documentation:
  <https://developers.google.com/edge/mediapipe/solutions/vision/face_detector>.

No runtime CDN is required. The browser downloads these assets from this site
only when the duo-photo feature is used.
