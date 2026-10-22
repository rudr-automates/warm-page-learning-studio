# Phase 2 — Learning Studio

## Available
- Signed-in course collection at `/courses`, imported-video library at `/library`, course outlines at `/courses/:courseId`, and Learning Studio at `/learn/:lessonId`.
- Original demonstration course: **Understanding RAG: From Retrieval to Grounded Answers**. Three short narrated MP4 lessons cover embeddings, hybrid retrieval, knowledge graphs, citations and uncertainty. Synthetic narration is explicitly labelled. Transcripts and narration share one source.
- Playback controls, active transcript highlighting, caption search and timestamp seeking.
- Owner-only Supabase notes and bookmarks with create, edit, delete and timestamp revisit.
- Resume checkpoints every ten seconds while dirty, on pause/seeking, lesson navigation and visibility changes. Best-effort save on unmount; an abrupt browser termination may lose the most recent checkpoint. Explicit completion is separate from measured continuous watch time; seeking does not mark a lesson watched or complete.
- Downloadable original PDF, PPTX, Markdown notes, Python example and VTT captions.
- Import YouTube, Vimeo and direct public HTTPS MP4/WebM URLs. User-owned imported lessons remain private. Videos depend on source availability and embedding permissions. Paste or upload authorized SRT/VTT captions separately; captions are not scraped or automatically transcribed.

## Deferred to Phase 3
External LLM integration, AI tutor, ingestion/indexing, evidence inspection and enforcement for AI answers, local video/document uploads, transcription and asynchronous processing. No live AI or embedding provider is connected. Never present transcript availability as AI readiness.

## Reproduce and export
Run `python3 scripts/generate-sample-course.py /tmp/horizon-course` with Pillow, reportlab, python-pptx, ffmpeg and Nix/espeak installed. The generated PDF and PPTX are actual files, not screenshots. The Python rank-fusion example is deterministic educational code, not a live retrieval service.

Media pointers under `src/assets/*.asset.json` use Lovable-hosted `/__l5e/assets-v1/` paths. For independent hosting, regenerate/download these files, place them in your own public asset host, replace the pointer URLs, and update `lessons.video_url` using a migration. Also serve the files under `public/sample`. These are media-hosting paths, not an AI gateway dependency. Auth and personal records continue using your configured Supabase project and owner-only policies. Run all SQL migrations including course seeding in order.

## Validation
`bunx vitest run src/test/learning.test.ts src/test/streak.test.ts src/test/app-routing.test.tsx` covers timing boundaries, safe resume, explicit completion, watch accounting, captions, URL validation and existing behavior. Actual media playback and download responses can be checked independently of authentication. Automated signed-in end-to-end checks are unavailable for the connected externally managed Supabase project; notes persistence, imported provider playback and cross-session UI progress still require a signed-in manual check.