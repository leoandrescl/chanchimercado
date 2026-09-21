import { Hono } from 'hono';
import type { AppEnv } from '../types';

const images = new Hono<AppEnv>();

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

images.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const prefix = '/api/images/';
  const idx = url.pathname.indexOf(prefix);
  const key = decodeURIComponent(url.pathname.slice(idx + prefix.length));
  if (!key) return c.notFound();

  const { value, metadata } = await c.env.IMAGES.getWithMetadata<{ contentType?: string }>(key, 'arrayBuffer');
  if (!value) return c.notFound();

  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType = metadata?.contentType || MIME[ext] || 'application/octet-stream';

  return new Response(value, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export default images;
