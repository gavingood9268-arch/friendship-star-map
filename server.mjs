import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), 'dist');
const rooms = new Map();
const sockets = new Map();

const json = (response, status, value) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const makeCode = () => randomBytes(3).toString('hex').toUpperCase();
const makeSecret = () => randomBytes(18).toString('base64url');

const findParticipant = (room, participantId, token) =>
  room?.participants.find((participant) => participant.id === participantId && participant.token === token);

const publicRoom = (room) => {
  const revealReady = room.participants.length === 2 && room.participants.every((p) => p.submitted && p.consent);
  return {
    code: room.code,
    status: room.status,
    revealReady,
    participants: room.participants.map(({ token, deviceId, summary, ...participant }) => ({
      ...participant,
      summary: revealReady ? summary : null,
    })),
    customQuestions: room.customQuestions,
  };
};

const broadcast = (room) => {
  const payload = JSON.stringify({ type: 'room', room: publicRoom(room) });
  for (const socket of sockets.get(room.code) || []) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
};

const handleApi = async (request, response, url) => {
  if (request.method === 'POST' && url.pathname === '/api/rooms') {
    const { otherName, deviceId } = await readBody(request);
    if (!otherName?.trim()) return json(response, 400, { error: '请填写对方称呼' });
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const participant = { id: makeSecret(), token: makeSecret(), deviceId: String(deviceId || '').slice(0, 80), otherName: otherName.trim().slice(0, 12), ready: false, progress: 0, submitted: false, consent: false, summary: null };
    const room = { code, status: 'waiting', createdAt: Date.now(), participants: [participant], customQuestions: [] };
    rooms.set(code, room);
    return json(response, 201, { room: publicRoom(room), participantId: participant.id, token: participant.token });
  }

  const match = url.pathname.match(/^\/api\/rooms\/([A-F0-9]{6})(?:\/(join|action))?$/);
  if (!match) return false;
  const [, code, operation] = match;
  const room = rooms.get(code);
  if (!room) return json(response, 404, { error: '房间不存在或已过期' });

  if (request.method === 'POST' && operation === 'join') {
    const { otherName, deviceId } = await readBody(request);
    if (!otherName?.trim()) return json(response, 400, { error: '请填写对方称呼' });
    const returningParticipant = deviceId && room.participants.find((participant) => participant.deviceId === String(deviceId));
    if (returningParticipant) {
      return json(response, 200, { room: publicRoom(room), participantId: returningParticipant.id, token: returningParticipant.token, resumed: true });
    }
    if (room.participants.length >= 2) return json(response, 409, { error: '房间已经满员' });
    const participant = { id: makeSecret(), token: makeSecret(), deviceId: String(deviceId || '').slice(0, 80), otherName: otherName.trim().slice(0, 12), ready: false, progress: 0, submitted: false, consent: false, summary: null };
    room.participants.push(participant);
    broadcast(room);
    return json(response, 200, { room: publicRoom(room), participantId: participant.id, token: participant.token });
  }

  if (request.method === 'POST' && operation === 'action') {
    const body = await readBody(request);
    const participant = findParticipant(room, body.participantId, body.token);
    if (!participant) return json(response, 403, { error: '无权访问这个房间' });
    if (body.type === 'ready') participant.ready = true;
    if (body.type === 'progress') participant.progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
    if (body.type === 'reopen') {
      participant.submitted = false;
      participant.consent = false;
      participant.progress = Math.max(0, Math.min(99, Number(body.progress) || 0));
    }
    if (body.type === 'submit') {
      participant.submitted = true;
      participant.consent = body.consent === true;
      participant.progress = 100;
      participant.summary = body.summary || null;
    }
    if (body.type === 'custom_question') {
      const text = String(body.text || '').trim().slice(0, 80);
      const target = room.participants.find((item) => item.id !== participant.id);
      const sentCount = room.customQuestions.filter((item) => item.from === participant.id).length;
      if (!target) return json(response, 409, { error: '对方还没有加入' });
      if (!text) return json(response, 400, { error: '问题不能为空' });
      if (sentCount >= 3) return json(response, 429, { error: '每次探索最多投递3道支线题' });
      room.customQuestions.push({ id: makeSecret(), from: participant.id, to: target.id, text, createdAt: Date.now(), answer: null, answeredAt: null });
    }
    if (body.type === 'custom_answer') {
      const customQuestion = room.customQuestions.find((item) => item.id === body.questionId && item.to === participant.id);
      if (!customQuestion) return json(response, 404, { error: '这道支线题不存在' });
      customQuestion.answer = { choice: ['answer', 'later', 'skip'].includes(body.choice) ? body.choice : 'skip', text: String(body.text || '').trim().slice(0, 200) };
      customQuestion.answeredAt = Date.now();
    }
    if (room.participants.length === 2 && room.participants.every((p) => p.ready)) room.status = 'active';
    broadcast(room);
    return json(response, 200, { room: publicRoom(room) });
  }

  if (request.method === 'GET' && !operation) {
    const participant = findParticipant(room, url.searchParams.get('participantId'), url.searchParams.get('token'));
    if (!participant) return json(response, 403, { error: '无权访问这个房间' });
    return json(response, 200, { room: publicRoom(room) });
  }
  return json(response, 405, { error: '不支持的请求' });
};

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(request, response, url);
      if (handled === false) json(response, 404, { error: '接口不存在' });
      return;
    }
    const requestedPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = join(root, safePath);
    if (!existsSync(filePath)) filePath = join(root, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=86400' });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    json(response, 500, { error: '服务器暂时不可用' });
  }
});

const websocketServer = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== '/ws') return socket.destroy();
  const room = rooms.get(url.searchParams.get('room'));
  const participant = findParticipant(room, url.searchParams.get('participant'), url.searchParams.get('token'));
  if (!participant) return socket.destroy();
  websocketServer.handleUpgrade(request, socket, head, (websocket) => websocketServer.emit('connection', websocket, room));
});

websocketServer.on('connection', (socket, room) => {
  if (!sockets.has(room.code)) sockets.set(room.code, new Set());
  sockets.get(room.code).add(socket);
  socket.send(JSON.stringify({ type: 'room', room: publicRoom(room) }));
  socket.on('close', () => sockets.get(room.code)?.delete(socket));
});

setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [code, room] of rooms) if (room.createdAt < cutoff) rooms.delete(code);
}, 60 * 60 * 1000).unref();

server.listen(port, '0.0.0.0', () => console.log(`双人星图运行于 http://0.0.0.0:${port}`));
