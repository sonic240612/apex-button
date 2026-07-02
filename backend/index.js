const fastify = require('fastify')({ logger: true });
const socketio = require('socket.io');
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const io = socketio(fastify.server, {
  cors: {
    origin: '*',
  },
});

// Redis Keys
const KEY_BUTTON_STATE = 'apex:button:state'; // 'cooldown', 'active', 'decision'
const KEY_BUTTON_TIMER = 'apex:button:timer'; // seconds remaining
const KEY_WINNER = 'apex:button:winner';
const KEY_BUTTON_ACTIVE_TIME = 'apex:button:active_time';
const KEY_HISTORY = 'apex:button:history';

// Lua Script for atomic winner selection
const WINNER_LUA_SCRIPT = `
  local state = redis.call('GET', KEYS[1])
  if state == 'active' then
    redis.call('SET', KEYS[1], 'decision')
    redis.call('SET', KEYS[2], ARGV[1])
    return 1
  else
    return 0
  end
`;

async function initializeButton() {
  await redis.set(KEY_BUTTON_STATE, 'cooldown');
  await redis.set(KEY_BUTTON_TIMER, 10); // Reduced to 10s for faster testing
}

async function updateGameState() {
  const state = await redis.get(KEY_BUTTON_STATE);
  let timer = await redis.get(KEY_BUTTON_TIMER);
  timer = parseInt(timer || 0);

  if (state === 'cooldown') {
    if (timer <= 0) {
      await redis.set(KEY_BUTTON_STATE, 'active');
      await redis.set(KEY_BUTTON_ACTIVE_TIME, Date.now());
      io.emit('state_change', { state: 'active' });
    } else {
      await redis.decr(KEY_BUTTON_TIMER);
    }
  } else if (state === 'decision') {
    // After some time in decision state, go back to cooldown
    // For simplicity, let's just use a timer for decision state too
    // In a real app, this would be a separate timer
  }

  const currentState = await redis.get(KEY_BUTTON_STATE);
  const currentTimer = await redis.get(KEY_BUTTON_TIMER);
  io.emit('tick', { state: currentState, timer: currentTimer });
}

// State transition: Decision -> Cooldown
async function resetButton() {
  const cooldownTime = Math.floor(Math.random() * (120 - 60 + 1)) + 60; // 60-120s for testing
  await redis.set(KEY_BUTTON_STATE, 'cooldown');
  await redis.set(KEY_BUTTON_TIMER, cooldownTime);
  await redis.del(KEY_WINNER);
  io.emit('state_change', { state: 'cooldown', timer: cooldownTime });
}

io.on('connection', (socket) => {
  fastify.log.info(`User connected: ${socket.id}`);

  // Send initial state, timer, history and current winner
  (async () => {
    const state = await redis.get(KEY_BUTTON_STATE);
    const timer = await redis.get(KEY_BUTTON_TIMER);
    const history = await redis.lrange(KEY_HISTORY, 0, 9);
    const winners = history.map(item => JSON.parse(item));
    const currentWinner = winners[0] || null;
    
    socket.emit('init_data', { 
      state, 
      timer, 
      winners, 
      currentWinner 
    });
  })();

  socket.on('join', (profile) => {
    socket.profile = profile; // { name, country }
    fastify.log.info(`User ${profile.name} from ${profile.country} joined`);
  });

  socket.on('click', async () => {
    if (!socket.profile) {
      return socket.emit('error', 'Please enter your profile first');
    }

    const result = await redis.eval(WINNER_LUA_SCRIPT, 2, KEY_BUTTON_STATE, KEY_WINNER, JSON.stringify(socket.profile));

    if (result === 1) {
      const clickTime = Date.now();
      const activeTimeStr = await redis.get(KEY_BUTTON_ACTIVE_TIME);
      const activeTime = parseInt(activeTimeStr || '0');
      
      // If activeTime is 0, it means it wasn't set properly. 
      // We use a fallback of 0ms or current time to avoid huge numbers.
      const reactionTime = activeTime > 0 ? clickTime - activeTime : 0;
      
      const winnerData = {
        ...socket.profile,
        reactionTime,
        timestamp: new Date(clickTime).toISOString(),
      };

      fastify.log.info(`WINNER: ${socket.profile.name} from ${socket.profile.country} in ${reactionTime}ms`);
      
      // Save to history (LPUSH + LTRIM for last 10)
      await redis.lpush(KEY_HISTORY, JSON.stringify(winnerData));
      await redis.ltrim(KEY_HISTORY, 0, 9);

      io.emit('winner_decided', {
        winner: winnerData,
      });
      
      // Transition to cooldown after 10 seconds of glory
      setTimeout(resetButton, 10000);
    } else {
      socket.emit('click_failed', 'Too slow!');
    }
  });

  socket.on('disconnect', () => {
    fastify.log.info(`User disconnected: ${socket.id}`);
  });
});

setInterval(updateGameState, 1000);

const start = async () => {
  try {
    await initializeButton();
    await fastify.listen({ port: process.env.PORT || 4000, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
