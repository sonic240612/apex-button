const Redis = require('ioredis');

// Initialize Redis
const redisUrl = process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

// Redis Keys
const KEY_TARGET_ACTIVE_TIME = 'apex:target_active_time';
const KEY_GLORY_END_TIME = 'apex:glory_end_time';
const KEY_CURRENT_WINNER = 'apex:current_winner';
const KEY_HISTORY = 'apex:history';

// Helper to CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // ----------------------------------------------------
    // 1. GET /state - Get current game state
    // ----------------------------------------------------
    if (path === '/state' && req.method === 'GET') {
      const now = Date.now();

      // Read from Redis
      let targetActiveTime = parseInt(await redis.get(KEY_TARGET_ACTIVE_TIME) || '0');
      let gloryEndTime = parseInt(await redis.get(KEY_GLORY_END_TIME) || '0');
      let currentWinner = await redis.get(KEY_CURRENT_WINNER);
      const historyRaw = await redis.lrange(KEY_HISTORY, 0, 9);
      const history = historyRaw.map(item => JSON.parse(item));

      // If database is completely uninitialized, set an initial target time (10s from now)
      if (targetActiveTime === 0) {
        targetActiveTime = now + 5 * 60 * 1000; // 5 minutes
        await redis.set(KEY_TARGET_ACTIVE_TIME, targetActiveTime);
      }

      let state = 'cooldown';
      let timer = 0;

      if (currentWinner && now < gloryEndTime) {
        state = 'decision';
        timer = Math.max(0, Math.floor((gloryEndTime - now) / 1000));
      } else if (now >= targetActiveTime) {
        state = 'active';
        // Clear current winner from previous round if we transitioned to active
        if (currentWinner) {
          await redis.del(KEY_CURRENT_WINNER);
          currentWinner = null;
        }
      } else {
        state = 'cooldown';
        timer = Math.max(0, Math.floor((targetActiveTime - now) / 1000));
      }

      res.status(200).json({
        state,
        timer,
        winner: currentWinner ? JSON.parse(currentWinner) : null,
        history,
      });
      return;
    }

    // ----------------------------------------------------
    // 2. POST /click - Try to click the button
    // ----------------------------------------------------
    if (path === '/click' && req.method === 'POST') {
      // Parse body
      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
      });

      const { name, country } = JSON.parse(body || '{}');
      if (!name || !country) {
        res.status(400).json({ error: 'Name and country are required' });
        return;
      }

      const now = Date.now();
      let targetActiveTime = parseInt(await redis.get(KEY_TARGET_ACTIVE_TIME) || '0');
      let gloryEndTime = parseInt(await redis.get(KEY_GLORY_END_TIME) || '0');
      let currentWinner = await redis.get(KEY_CURRENT_WINNER);

      // Validate state is active
      const isActive = !currentWinner && now >= targetActiveTime;
      if (!isActive) {
        res.status(400).json({ error: 'Too slow or button not active yet!' });
        return;
      }

      // Lua script to atomically claim victory
      const claimScript = `
        local current = redis.call('GET', KEYS[1])
        if not current then
          redis.call('SET', KEYS[1], ARGV[1])
          redis.call('SET', KEYS[2], ARGV[2])
          redis.call('SET', KEYS[3], ARGV[3])
          redis.call('LPUSH', KEYS[4], ARGV[1])
          redis.call('LTRIM', KEYS[4], 0, 9)
          return 1
        else
          return 0
        end
      `;

      const reactionTime = now - targetActiveTime;
      const winnerData = {
        name,
        country,
        reactionTime,
        timestamp: new Date().toISOString(),
      };

      const newGloryEndTime = now + 10000; // 10s of glory
      const cooldownMin = 20 * 60 * 1000; // 20 minutes in ms
      const cooldownMax = 30 * 60 * 1000; // 30 minutes in ms
      const newTargetActiveTime = newGloryEndTime + cooldownMin + Math.floor(Math.random() * (cooldownMax - cooldownMin)); // 20-30 min cooldown

      const result = await redis.eval(
        claimScript,
        4,
        KEY_CURRENT_WINNER,
        KEY_GLORY_END_TIME,
        KEY_TARGET_ACTIVE_TIME,
        KEY_HISTORY,
        JSON.stringify(winnerData),
        newGloryEndTime,
        newTargetActiveTime
      );

      if (result === 1) {
        res.status(200).json({ success: true, winner: winnerData });
      } else {
        res.status(400).json({ error: 'Too slow! Someone else claimed it.' });
      }
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
