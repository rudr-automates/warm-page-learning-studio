import { supabase } from '@/integrations/supabase/client';

export const STORAGE_BUCKET = 'learning-resources';
export const STORAGE_PREFIX = `storage:${STORAGE_BUCKET}/`;

export const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'MP4', 'video/webm': 'WebM' };
export const DOC_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'text/markdown': 'Markdown',
  'text/plain': 'Text',
};
export const ACCEPTED_TYPES = { ...VIDEO_TYPES, ...DOC_TYPES };
export const MAX_FILE_BYTES = 500 * 1024 * 1024;

export function isVideoFile(file: File) {
  return file.type in VIDEO_TYPES || /\.(mp4|webm)$/i.test(file.name);
}
export function isAcceptedFile(file: File) {
  return file.type in ACCEPTED_TYPES || /\.(mp4|webm|pdf|pptx?|md|txt)$/i.test(file.name);
}
export function describeFile(file: File) {
  return ACCEPTED_TYPES[file.type] || file.name.split('.').pop()?.toUpperCase() || 'File';
}

export function isStorageUrl(url: string) {
  return url.startsWith(STORAGE_PREFIX);
}

// Private bucket: playback/downloads go through short-lived signed URLs.
export async function resolveStorageUrl(url: string): Promise<string> {
  if (!isStorageUrl(url)) return url;
  const path = url.slice(STORAGE_PREFIX.length);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw new Error('Could not open this file. It may have been removed from storage.');
  return data.signedUrl;
}

export function sanitizeFileName(name: string) {
  const clean = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return clean.slice(0, 80) || 'file';
}

export async function uploadToStorage(userId: string, kind: 'videos' | 'documents', file: File) {
  const path = `${userId}/${kind}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message || 'Upload failed.');
  return path;
}

// Best-effort duration from the local file before upload; 0 when unreadable.
export function readVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (seconds: number) => { URL.revokeObjectURL(url); resolve(Number.isFinite(seconds) ? Math.round(seconds) : 0); };
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(0);
    video.src = url;
  });
}
