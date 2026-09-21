import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'test-secret';

describe('session tokens', () => {
  it('validates a freshly created token', async () => {
    const token = await createSessionToken(SECRET, 60);
    expect(await verifySessionToken(SECRET, token)).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(SECRET, 60);
    expect(await verifySessionToken('other-secret', token)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken(SECRET, 60);
    const [payload, sig] = token.split('.');
    const tampered = `${payload}x.${sig}`;
    expect(await verifySessionToken(SECRET, tampered)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const token = await createSessionToken(SECRET, -10);
    expect(await verifySessionToken(SECRET, token)).toBe(false);
  });

  it('rejects missing or malformed tokens', async () => {
    expect(await verifySessionToken(SECRET, undefined)).toBe(false);
    expect(await verifySessionToken(SECRET, 'not-a-token')).toBe(false);
  });
});
