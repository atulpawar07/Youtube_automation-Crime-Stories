# History Crime Shorts Studio

A local web tool for producing one-minute history-crime Shorts.

It generates:

- 10 sections of 6 seconds each
- AI-researched and fact-checked scripts
- voiceover audio with TTS
- AI images for each section
- animated section clips
- final vertical MP4 assembly
- captions
- audio cues
- JSON, CSV, and Markdown exports

## Setup

1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key to `.env`.
3. Install a project-local copy of `ffmpeg`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-ffmpeg.ps1
```

You can also use a system-wide `ffmpeg` installation if it is already on your PATH.
4. Start the local server:

```bash
npm start
```

Then open:

```text
http://localhost:4317
```

Choose a case, tone, and visual style, then generate a new 60-second plan. The exports can be used in a video editor, animation workflow, or future automation pipeline.

## Workflow

1. Generate the base 10-section short.
2. Click **AI research** to improve the case facts and mark uncertain claims.
3. Click **Create video** to generate TTS audio, images, animated clips, and `final-short.mp4`.

Finished jobs are written to `outputs/<job-name>/`.

## Notes

- TTS narration includes an AI-voice disclosure.
- The tool avoids graphic visuals and asks the model to label uncertain claims.
- Historical crime cases still need human review before publishing.
