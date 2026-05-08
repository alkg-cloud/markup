import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/jwt';

describe('session jwt', () => {
  it('round-trips a payload', async () => {
    const token = await signSession({ sessionId: 'sess_1', userId: 'u_1' }, 60);
    const payload = await verifySession(token);
    expect(payload.sessionId).toBe('sess_1');
    expect(payload.userId).toBe('u_1');
  });

  it('rejects tampered tokens', async () => {
    const token = await signSession({ sessionId: 's', userId: 'u' }, 60);
    const tampered = `${token}xx`;
    await expect(verifySession(tampered)).rejects.toThrow();
  });

  it('rejects expired tokens', async () => {
    const token = await signSession({ sessionId: 's', userId: 'u' }, -1);
    await expect(verifySession(token)).rejects.toThrow();
  });
});
