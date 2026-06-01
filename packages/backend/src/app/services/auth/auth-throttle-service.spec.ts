import { describe, expect, it, vi } from 'vitest';

const evalMock = vi.fn();

vi.mock('#database/redis.js', () => ({
  default: {
    eval: evalMock,
  },
}));

describe('consumeAuthThrottle', () => {
  it('increments the auth throttle key atomically with TTL applied on first hit', async () => {
    evalMock.mockResolvedValue(1);

    const { consumeAuthThrottle } = await import('./auth-throttle-service.js');
    const result = await consumeAuthThrottle({
      scope: 'confirm_phone_ip',
      key: '127.0.0.1',
      limit: 20,
      windowSeconds: 3600,
    });

    expect(result).toEqual({
      allowed: true,
      count: 1,
    });
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR'"),
      1,
      'auth:throttle:confirm_phone_ip:127.0.0.1',
      '3600',
    );
  });
});
