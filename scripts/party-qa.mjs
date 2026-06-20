import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = 'http://127.0.0.1:4173';
const output = new URL('../output/qa/', import.meta.url);
const pathFor = (name) => fileURLToPath(new URL(name, output));
await mkdir(output, { recursive: true });
const post = async (path, body) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(data)}`);
  return data;
};

const names = ['桃桃乌龙', '阿泽', '小宇同学', '芝士奶盖', '小熊软糖'];
const host = await post('/api/game-rooms', { name: names[0], avatar: 2, deviceId: `edge-qa-0-${Date.now()}` });
const code = host.room.code;
const players = [host];
for (let index = 1; index < names.length; index += 1) players.push(await post(`/api/game-rooms/${code}/join`, { name: names[index], avatar: index % 5, deviceId: `edge-qa-${index}-${Date.now()}` }));
const act = (player, action) => post(`/api/game-rooms/${code}/action`, { ...action, participantId: player.participantId, token: player.token });
for (const player of players.slice(1)) await act(player, { type: 'ready' });
let state = await act(host, { type: 'start' });

for (let round = 0; round < 2; round += 1) {
  const question = state.room.currentQuestion;
  for (const player of players) state = await act(player, { type: 'answer', value: question.type === 'point' ? host.participantId : 0 });
  if (state.room.phase === 'guess') for (const player of players) state = await act(player, { type: 'guess', value: 0 });
  state = await act(host, { type: 'next' });
}
await act(players[1], { type: 'chat', text: '我已经知道是谁了' });
await act(players[3], { type: 'chat', text: '别看我，真的不是我' });
await act(players[4], { type: 'chat', text: '这题也太明显了' });
for (const player of players.slice(1)) await act(player, { type: 'answer', value: players[3].participantId });

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await context.addInitScript(({ roomCode, session }) => localStorage.setItem(`party-room-${roomCode}`, JSON.stringify(session)), { roomCode: code, session: { participantId: host.participantId, token: host.token } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
await page.goto(`${base}?room=${code}`, { waitUntil: 'networkidle' });
await page.getByText('谁最可能说“马上到”但还没出门？').waitFor();
await page.locator('.choice-grid .player-avatar').nth(3).click();
await page.screenshot({ path: pathFor('party-game-edge-390x844.png') });

const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const home = await desktop.newPage();
await home.goto(base, { waitUntil: 'networkidle' });
await home.screenshot({ path: pathFor('party-home-edge-1280x900.png') });
console.log(JSON.stringify({ roomCode: code, errors, gameScreenshot: pathFor('party-game-edge-390x844.png') }, null, 2));
await browser.close();
