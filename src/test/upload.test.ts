import { describe, expect, it } from 'vitest';
import { isAcceptedFile, isVideoFile, sanitizeFileName, isStorageUrl, STORAGE_PREFIX } from '@/lib/upload';

const file = (name: string, type: string) => new File(['x'], name, { type });

describe('upload rules', () => {
  it('accepts mp4, webm, pdf, pptx, markdown, and text files', () => {
    for (const f of [file('a.mp4', 'video/mp4'), file('b.webm', 'video/webm'), file('c.pdf', 'application/pdf'), file('d.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), file('e.md', 'text/markdown'), file('f.txt', 'text/plain')]) expect(isAcceptedFile(f)).toBe(true);
  });
  it('rejects executables and archives', () => {
    for (const f of [file('a.exe', 'application/x-msdownload'), file('b.zip', 'application/zip'), file('c.js', 'text/javascript')]) expect(isAcceptedFile(f)).toBe(false);
  });
  it('treats only video files as lessons', () => {
    expect(isVideoFile(file('a.mp4', 'video/mp4'))).toBe(true);
    expect(isVideoFile(file('c.pdf', 'application/pdf'))).toBe(false);
  });
  it('sanitizes file names for storage paths', () => {
    expect(sanitizeFileName('my lecture (final).MP4')).toBe('my-lecture-final.MP4');
    expect(sanitizeFileName('...')).toBe('file');
  });
  it('recognizes storage-backed lesson URLs', () => {
    expect(isStorageUrl(`${STORAGE_PREFIX}uid/videos/1-a.mp4`)).toBe(true);
    expect(isStorageUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe(false);
  });
});
