import redis from '#database/redis.js';

const THROTTLE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

export async function consumeAuthThrottle(input: {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; count: number }> {
  const redisKey = `auth:throttle:${input.scope}:${input.key}`;
  const count = Number(
    await redis.eval(THROTTLE_LUA, 1, redisKey, String(input.windowSeconds)),
  );

  return {
    allowed: count <= input.limit,
    count,
  };
}
