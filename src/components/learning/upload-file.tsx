import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, Film, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { isAcceptedFile, isVideoFile, describeFile, readVideoDuration, uploadToStorage, STORAGE_PREFIX, MAX_FILE_BYTES } from '@/lib/upload';

type QueueItem = { file: File; status: 'waiting' | 'working' | 'done' | 'failed'; detail?: string };

export function UploadFile({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate(), qc = useQueryClient();

  function enqueue(files: FileList | File[]) {
    const items: QueueItem[] = [];
    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file)) { toast.error(`"${file.name}" is not a supported type. Use MP4, WebM, PDF, PowerPoint, Markdown, or text.`); continue; }
      if (file.size > MAX_FILE_BYTES) { toast.error(`"${file.name}" is over the 500 MB limit.`); continue; }
      items.push({ file, status: 'waiting' });
    }
    if (items.length) { setQueue(q => [...q, ...items]); void process([...queue, ...items]); }
  }

  async function process(items: QueueItem[]) {
    if (busy.current) return;
    busy.current = true;
    const patch = (file: File, p: Partial<QueueItem>) => setQueue(q => q.map(i => (i.file === file ? { ...i, ...p } : i)));
    let firstLesson: string | null = null;
    for (const item of items.filter(i => i.status === 'waiting')) {
      patch(item.file, { status: 'working' });
      try {
        if (isVideoFile(item.file)) {
          const [path, duration] = await Promise.all([uploadToStorage(userId, 'videos', item.file), readVideoDuration(item.file)]);
          const title = item.file.name.replace(/\.[^.]+$/, '').slice(0, 200) || 'Uploaded video';
          const { data, error } = await supabase.from('lessons').insert({ user_id: userId, title, video_url: STORAGE_PREFIX + path, provider: 'direct', duration_seconds: duration }).select('id').single();
          if (error) throw error;
          firstLesson = firstLesson || data.id;
          patch(item.file, { status: 'done', detail: 'Added as a lesson' });
        } else {
          const path = await uploadToStorage(userId, 'documents', item.file);
          const { error } = await supabase.from('learning_resources').insert({ owner_id: userId, kind: 'document', title: item.file.name.slice(0, 200), source_url: path, status: 'uploaded', metadata: { size_bytes: item.file.size, content_type: item.file.type || null } });
          if (error) throw error;
          patch(item.file, { status: 'done', detail: 'Saved to your documents' });
        }
      } catch (e) {
        patch(item.file, { status: 'failed', detail: e instanceof Error ? e.message : 'Upload failed.' });
      }
    }
    busy.current = false;
    await Promise.all([qc.invalidateQueries({ queryKey: ['learning', 'catalog'] }), qc.invalidateQueries({ queryKey: ['learning', 'resources', userId] })]);
    if (firstLesson) { setOpen(false); setQueue([]); navigate({ to: '/learn/$lessonId', params: { lessonId: firstLesson } }); }
  }

  const working = queue.some(i => i.status === 'working' || i.status === 'waiting');
  return (
    <Dialog open={open} onOpenChange={o => { if (!working) { setOpen(o); if (!o) setQueue([]); } }}>
      <DialogTrigger asChild><Button variant="outline"><Upload />Upload files</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload from your device</DialogTitle>
          <DialogDescription>MP4/WebM videos become lessons in your library. PDFs, slides, and notes are saved as study documents. Files stay private to your account.</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); enqueue(e.dataTransfer.files); }}
          className={`flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-primary bg-secondary' : 'border-border hover:border-primary/60'}`}
        >
          <FileUp className="size-8 text-forest" />
          <span className="text-sm font-medium">Drag and drop files here, or click to browse</span>
          <span className="text-xs text-muted-foreground">MP4 · WebM · PDF · PowerPoint · Markdown · Text — up to 500 MB each</span>
        </button>
        <input ref={input} type="file" multiple className="hidden" accept=".mp4,.webm,.pdf,.pptx,.ppt,.md,.txt,video/mp4,video/webm,application/pdf" onChange={e => { if (e.target.files?.length) enqueue(e.target.files); e.target.value = ''; }} />
        {queue.length > 0 && (
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
            {queue.map(item => (
              <li key={item.file.name + item.file.size} className="flex items-center gap-3 px-3 py-2 text-sm">
                {isVideoFile(item.file) ? <Film className="size-4 shrink-0 text-forest" /> : <FileText className="size-4 shrink-0 text-forest" />}
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                <span className="text-xs text-muted-foreground">{describeFile(item.file)}</span>
                {item.status === 'working' && <Loader2 className="size-4 animate-spin text-primary" aria-label="Uploading" />}
                {item.status === 'waiting' && <span className="text-xs text-muted-foreground">Queued</span>}
                {item.status === 'done' && <span className="flex items-center gap-1 text-xs text-forest"><CheckCircle2 className="size-4" />{item.detail}</span>}
                {item.status === 'failed' && <span className="flex items-center gap-1 text-xs text-destructive" title={item.detail}><XCircle className="size-4" />Failed</span>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
