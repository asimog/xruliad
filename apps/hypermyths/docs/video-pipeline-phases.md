# Video Pipeline TODO

Date: 2026-04-13

## Goal

Ship the video pipeline in small verified phases instead of continuing with the broken stitched path.

## Phases

### Phase 1: 8-second prompt video displayed

Definition of done:

- A simple prompt creates a job successfully.
- The job produces one single 8-second xAI video.
- The generated clip is uploaded to persistent storage.
- The job page displays the video in the website player.
- No stitching is involved.

### Phase 2: X autobiography with last 16 tweets

Definition of done:

- MythX jobs use the last 16 tweets, not 42.
- The X transcript is used only after the single-video pipeline is stable.
- The job still ends in one reliable displayed video before any multi-clip work.

### Phase 3: Memecoin video

Definition of done:

- Token jobs are restored only after prompt and X jobs are stable.
- Memecoin jobs use the same proven single-video persistence/display path first.

### Phase 4: Stitching two videos together

Definition of done:

- Stitching is reintroduced only after phases 1-3 are stable.
- The stitcher uploads local output correctly as a file, not as a remote URL fetch.
- The website plays the stitched result from a persistent public URL.

## Guardrails

- Do not add more clips until one clip is stable.
- Do not depend on background fire-and-forget processing in environments where the request can terminate the work.
- Do not pass local filesystem paths into helpers that expect remote URLs.
