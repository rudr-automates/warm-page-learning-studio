import ReactPlayer from 'react-player';
import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '@/lib/learning-queries';
import { clampPosition, watchedDelta } from '@/lib/learning';
import { isStorageUrl, resolveStorageUrl } from '@/lib/upload';

export function LessonPlayer({ lesson, initialPosition, seek, onPosition, onCheckpoint, onDuration }: {
  lesson: Lesson; initialPosition: number; seek: { time: number; key: number } | null;
  onPosition: (time: number, watched: number) => void; onCheckpoint: () => void; onDuration: (duration: number) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const previous = useRef({ position: initialPosition, wall: performance.now() });
  const ready = useRef(false), playing = useRef(false), seeking = useRef(false);
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<string | null>(isStorageUrl(lesson.video_url) ? null : lesson.video_url);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (isStorageUrl(lesson.video_url)) {
      setSrc(null);
      resolveStorageUrl(lesson.video_url).then(url => { if (!cancelled) setSrc(url); }).catch(() => { if (!cancelled) setFailed(true); });
    } else setSrc(lesson.video_url);
    return () => { cancelled = true; };
  }, [lesson.video_url]);
  useEffect(() => { if (seek && ref.current) ref.current.currentTime = clampPosition(seek.time, ref.current.duration || lesson.duration_seconds); }, [seek, lesson.duration_seconds]);
  function load() {
    const p = ref.current; if (!p) return;
    if (Number.isFinite(p.duration)) onDuration(p.duration);
    if (!ready.current) { p.currentTime = clampPosition(initialPosition, p.duration || lesson.duration_seconds); ready.current = true; }
  }
  function update() {
    const p=ref.current; if (!p) return;
    const now=performance.now(); const delta=watchedDelta(previous.current.position,p.currentTime,(now-previous.current.wall)/1000,playing.current,seeking.current,p.playbackRate || 1);
    previous.current={position:p.currentTime,wall:now}; onPosition(p.currentTime, delta);
  }
  return <div className="relative aspect-video w-full overflow-hidden rounded-md bg-foreground text-background">{!src && !failed && <div className="absolute inset-0 flex items-center justify-center text-sm">Preparing your video…</div>}{src && <ReactPlayer ref={ref} src={src} controls playsInline width="100%" height="100%" onLoadedMetadata={load} onDurationChange={load} onTimeUpdate={update} onPlay={()=>{playing.current=true; previous.current.wall=performance.now();}} onPause={()=>{playing.current=false;onCheckpoint();}} onSeeking={()=>{seeking.current=true;}} onSeeked={()=>{seeking.current=false;previous.current={position:ref.current?.currentTime || 0,wall:performance.now()};onPosition(previous.current.position,0);onCheckpoint();}} onEnded={()=>{playing.current=false;onCheckpoint();}} onError={()=>setFailed(true)}/>}{failed && <div className="absolute inset-0 flex items-center justify-center bg-foreground p-6 text-center text-sm">This video could not play. The source may be unavailable or embedding may be restricted.</div>}</div>;
}