import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionSecret,
  verifySessionToken,
} from '../session';

const auth = new Hono<AppEnv>();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

auth.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  const expected = c.env.APP_PIN || '1549';

  if (!pin) return c.json({ error: 'Ingresa el PIN' }, 400);
  if (!timingSafeEqual(pin, expected)) {
    await new Promise((r) => setTimeout(r, 350));
    return c.json({ error: 'PIN incorrecto' }, 401);
  }

  const token = await createSessionToken(sessionSecret(c.env));
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: c.req.url.startsWith('https'),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return c.json({ ok: true });
});

auth.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  const ok = await verifySessionToken(sessionSecret(c.env), token);
  return c.json({ authed: ok }, ok ? 200 : 401);
});

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const ok = await verifySessionToken(sessionSecret(c.env), token);
  if (!ok) return c.json({ error: 'No autorizado' }, 401);
  await next();
};

export default auth;
