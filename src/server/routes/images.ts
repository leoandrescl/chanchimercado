import { Hono } from 'hono';
import type { AppEnv } from '../types';

const images = new Hono<AppEnv>();

images.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const prefix = '/api/images/';
  const idx = url.pathname.indexOf(prefix);
  const key = decodeURIComponent(url.pathname.slice(idx + prefix.length));
  if (!key) return c.notFound();

  const object = await c.env.IMAGES.get(key);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

export default images;
