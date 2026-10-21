import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { parseVideoUrl } from '@/lib/learning';

export function ImportVideo({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false), [url, setUrl] = useState(''), [title, setTitle] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate(), qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    try {
      const parsed = parseVideoUrl(url); setBusy(true);
      const { data, error } = await supabase.from('lessons').insert({ user_id: userId, title: title.trim(), video_url: parsed.url, provider: parsed.provider }).select('id').single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['learning', 'catalog'] });
      setOpen(false); setUrl(''); setTitle(''); navigate({ to: '/learn/$lessonId', params: { lessonId: data.id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add this video.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><Plus/>Import video</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add a video to your library</DialogTitle><DialogDescription>YouTube, Vimeo, or a public HTTPS MP4/WebM link. Playback depends on the source’s embedding permissions. Captions are added separately; AI indexing comes in Phase 3.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="video-title">Lesson title</Label><Input id="video-title" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="video-url">Video URL</Label><Input id="video-url" type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…"/></div><Button disabled={busy || !title.trim()} className="w-full"><LinkIcon/>{busy?'Adding…':'Add to library'}</Button></form></DialogContent></Dialog>;
}