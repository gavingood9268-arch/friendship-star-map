import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), 'dist');
const rooms = new Map();
const sockets = new Map();
const QUESTIONS = [
  { type: 'point', prompt: '谁最可能半夜突然想吃火锅？' },
  { type: 'choice', prompt: '群里突然安静，大家通常在干嘛？', options: ['偷偷潜水', '认真工作', '刷视频忘了回', '等别人先说话'] },
  { type: 'point', prompt: '谁最可能说“马上到”但还没出门？' },
  { type: 'choice', prompt: '临时多出一天假，大家最想怎么过？', options: ['睡到自然醒', '立刻出去玩', '在家打游戏', '约一桌好吃的'] },
  { type: 'point', prompt: '谁最适合保管全群人的秘密？' },
  { type: 'choice', prompt: '朋友生日，大家最可能准备什么？', options: ['认真挑礼物', '制造惊喜局', '发超长小作文', '请一顿好吃的'] },
  { type: 'point', prompt: '谁最可能在旅行前做满满一页攻略？' },
  { type: 'choice', prompt: '一起看电影时，大家最怕遇到什么？', options: ['剧透的人', '迟到的人', '一直讲话的人', '选片两小时的人'] },
  { type: 'point', prompt: '谁最可能一边说不困一边先睡着？' },
  { type: 'choice', prompt: '这群人的默契最像哪一种？', options: ['一个眼神就懂', '互相拆台也懂', '关键时刻很稳', '全靠临场发挥'] },
];

const makeCode = () => randomBytes(3).toString('hex').toUpperCase();
const makeSecret = () => randomBytes(18).toString('base64url');
const json = (response, status, value) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
};
const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};
const findParticipant = (room, id, token) => room?.participants.find((item) => item.id === id && item.token === token);
const tally = (values) => {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  return { counts, winners: Object.keys(counts).filter((key) => counts[key] === max), max };
};
const revealFor = (room) => {
  if (room.phase !== 'reveal') return null;
  const question = QUESTIONS[room.roundIndex];
  if (question.type === 'point') {
    const result = tally(Object.values(room.answers));
    const names = result.winners.map((id) => room.participants.find((item) => item.id === id)?.name).filter(Boolean);
    return { title: names.length ? `全场锁定：${names.join('、')}` : '这一题没有统一答案', subtitle: `最高获得 ${result.max} 票` };
  }
  const result = tally(Object.values(room.answers));
  const labels = result.winners.map((index) => question.options[Number(index)]).filter(Boolean);
  return { title: labels.length ? `多数答案：${labels.join(' / ')}` : '这一题没有统一答案', subtitle: '猜中多数答案的玩家默契值 +1' };
};
const publicRoom = (room, viewerId) => ({
  code: room.code,
  status: room.status,
  phase: room.phase,
  roundIndex: room.roundIndex,
  totalRounds: QUESTIONS.length,
  currentQuestion: room.status === 'playing' || room.status === 'reveal' ? { ...QUESTIONS[room.roundIndex] } : null,
  answerCount: Object.keys(room.answers).length,
  guessCount: Object.keys(room.guesses).length,
  viewerSubmitted: room.phase === 'guess' ? Object.hasOwn(room.guesses, viewerId) : Object.hasOwn(room.answers, viewerId),
  reveal: revealFor(room),
  participants: room.participants.map(({ token, deviceId, ...participant }) => participant),
  chat: room.chat.slice(-30),
});
const broadcast = (room) => {
  for (const client of sockets.get(room.code) || []) {
    if (client.socket.readyState === client.socket.OPEN) client.socket.send(JSON.stringify({ type: 'room', room: publicRoom(room, client.participantId) }));
  }
};
const allSubmitted = (room, collection) => room.participants.every((item) => Object.hasOwn(collection, item.id));
const finishRound = (room) => {
  const question = QUESTIONS[room.roundIndex];
  if (question.type === 'point') {
    const result = tally(Object.values(room.answers));
    for (const player of room.participants) if (result.winners.includes(String(room.answers[player.id]))) player.score += 1;
  } else {
    const result = tally(Object.values(room.answers));
    for (const player of room.participants) if (result.winners.includes(String(room.guesses[player.id]))) player.score += 1;
  }
  room.phase = 'reveal';
  room.status = 'reveal';
};
const newParticipant = ({ name, avatar, deviceId }, host = false) => ({
  id: makeSecret(), token: makeSecret(), deviceId: String(deviceId || '').slice(0, 80),
  name: String(name || '').trim().slice(0, 8), avatar: Math.max(0, Math.min(4, Number(avatar) || 0)),
  host, ready: host, score: 0,
});

const handleApi = async (request, response, url) => {
  if (request.method === 'POST' && url.pathname === '/api/game-rooms') {
    const body = await readBody(request);
    if (!body.name?.trim()) return json(response, 400, { error: '请填写游戏名' });
    let code = makeCode(); while (rooms.has(code)) code = makeCode();
    const participant = newParticipant(body, true);
    const room = { code, status: 'waiting', phase: 'answer', roundIndex: 0, createdAt: Date.now(), participants: [participant], answers: {}, guesses: {}, chat: [] };
    rooms.set(code, room);
    return json(response, 201, { room: publicRoom(room, participant.id), participantId: participant.id, token: participant.token });
  }

  const match = url.pathname.match(/^\/api\/game-rooms\/([A-F0-9]{6})(?:\/(join|action))?$/);
  if (!match) return false;
  const [, code, operation] = match;
  const room = rooms.get(code);
  if (!room) return json(response, 404, { error: '房间不存在或已经结束' });

  if (request.method === 'POST' && operation === 'join') {
    const body = await readBody(request);
    if (!body.name?.trim()) return json(response, 400, { error: '请填写游戏名' });
    const returning = body.deviceId && room.participants.find((item) => item.deviceId === String(body.deviceId));
    if (returning) return json(response, 200, { room: publicRoom(room, returning.id), participantId: returning.id, token: returning.token, resumed: true });
    if (room.status !== 'waiting') return json(response, 409, { error: '这局已经开始了' });
    if (room.participants.length >= 8) return json(response, 409, { error: '房间已经坐满8人' });
    const participant = newParticipant(body);
    room.participants.push(participant); broadcast(room);
    return json(response, 200, { room: publicRoom(room, participant.id), participantId: participant.id, token: participant.token });
  }

  if (request.method === 'POST' && operation === 'action') {
    const body = await readBody(request);
    const participant = findParticipant(room, body.participantId, body.token);
    if (!participant) return json(response, 403, { error: '身份已经失效' });
    if (body.type === 'ready' && room.status === 'waiting') participant.ready = true;
    if (body.type === 'start') {
      if (!participant.host) return json(response, 403, { error: '只有房主能开始' });
      if (room.participants.length < 3) return json(response, 409, { error: '至少3人才开局' });
      if (!room.participants.every((item) => item.ready)) return json(response, 409, { error: '还有人没准备好' });
      room.status = 'playing'; room.phase = 'answer'; room.roundIndex = 0; room.answers = {}; room.guesses = {};
    }
    if (body.type === 'answer' && room.status === 'playing' && room.phase === 'answer') {
      const question = QUESTIONS[room.roundIndex];
      const value = question.type === 'point' ? String(body.value) : Number(body.value);
      const valid = question.type === 'point' ? room.participants.some((item) => item.id === value) : Number.isInteger(value) && value >= 0 && value < question.options.length;
      if (!valid) return json(response, 400, { error: '这个答案无效' });
      if (!Object.hasOwn(room.answers, participant.id)) room.answers[participant.id] = value;
      if (allSubmitted(room, room.answers)) {
        if (question.type === 'choice') room.phase = 'guess'; else finishRound(room);
      }
    }
    if (body.type === 'guess' && room.status === 'playing' && room.phase === 'guess') {
      const value = Number(body.value);
      if (!Number.isInteger(value) || value < 0 || value >= QUESTIONS[room.roundIndex].options.length) return json(response, 400, { error: '这个答案无效' });
      if (!Object.hasOwn(room.guesses, participant.id)) room.guesses[participant.id] = value;
      if (allSubmitted(room, room.guesses)) finishRound(room);
    }
    if (body.type === 'next' && room.phase === 'reveal') {
      if (!participant.host) return json(response, 403, { error: '等房主进入下一题' });
      if (room.roundIndex >= QUESTIONS.length - 1) { room.status = 'finished'; }
      else { room.roundIndex += 1; room.phase = 'answer'; room.status = 'playing'; room.answers = {}; room.guesses = {}; }
    }
    if (body.type === 'chat') {
      const text = String(body.text || '').trim().slice(0, 60);
      if (text) room.chat.push({ id: makeSecret(), participantId: participant.id, name: participant.name, text, createdAt: Date.now() });
    }
    broadcast(room);
    return json(response, 200, { room: publicRoom(room, participant.id) });
  }

  if (request.method === 'GET' && !operation) {
    const participant = findParticipant(room, url.searchParams.get('participantId'), url.searchParams.get('token'));
    if (!participant) return json(response, 403, { error: '无权进入这个房间' });
    return json(response, 200, { room: publicRoom(room, participant.id) });
  }
  return json(response, 405, { error: '不支持的请求' });
};

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith('/api/')) { const handled = await handleApi(request, response, url); if (handled === false) json(response, 404, { error: '接口不存在' }); return; }
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
    let path = join(root, safe); if (!existsSync(path)) path = join(root, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': path.endsWith('index.html') ? 'no-cache' : 'public, max-age=86400' });
    createReadStream(path).pipe(response);
  } catch { json(response, 500, { error: '服务暂时不可用' }); }
});

const websocketServer = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== '/ws') return socket.destroy();
  const room = rooms.get(url.searchParams.get('room'));
  const participant = findParticipant(room, url.searchParams.get('participant'), url.searchParams.get('token'));
  if (!participant) return socket.destroy();
  websocketServer.handleUpgrade(request, socket, head, (ws) => websocketServer.emit('connection', ws, room, participant));
});
websocketServer.on('connection', (socket, room, participant) => {
  if (!sockets.has(room.code)) sockets.set(room.code, new Set());
  const client = { socket, participantId: participant.id };
  sockets.get(room.code).add(client);
  socket.send(JSON.stringify({ type: 'room', room: publicRoom(room, participant.id) }));
  socket.on('close', () => sockets.get(room.code)?.delete(client));
});
setInterval(() => { const cutoff = Date.now() - 24 * 60 * 60 * 1000; for (const [code, room] of rooms) if (room.createdAt < cutoff) rooms.delete(code); }, 60 * 60 * 1000).unref();
server.listen(port, '0.0.0.0', () => console.log(`默契大挑战运行于 http://0.0.0.0:${port}`));
