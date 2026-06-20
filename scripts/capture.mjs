import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../output/qa/', import.meta.url);
const pathFor = (name) => fileURLToPath(new URL(name, output));
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});

const errors = [];
const attachErrors = (page, label) => {
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`${label} console: ${msg.text()}`); });
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
};

const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const host = await hostContext.newPage();
const guest = await guestContext.newPage();
attachErrors(host, 'host');
attachErrors(guest, 'guest');

await host.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await host.screenshot({ path: pathFor('01-lobby-mobile.png'), fullPage: true });
await host.getByLabel('我眼中的对方').fill('阿哲');
await host.getByRole('button', { name: '创建双人房间' }).click();
await host.getByText(/正在等待阿哲/).waitFor();
const inviteUrl = host.url();
await host.screenshot({ path: pathFor('02-host-waiting-mobile.png'), fullPage: true });

await guest.goto(inviteUrl, { waitUntil: 'networkidle' });
await guest.getByLabel('我眼中的对方').fill('小鱼');
await guest.getByRole('button', { name: '加入双人房间' }).click();
await guest.getByText('两颗星已经相遇').waitFor();
await host.getByText('两颗星已经相遇').waitFor();
await host.waitForTimeout(400);
await host.screenshot({ path: pathFor('03-room-ready-mobile.png'), fullPage: true });

await host.getByRole('button', { name: '确认称呼，准备开始' }).click();
await guest.getByRole('button', { name: '确认称呼，准备开始' }).click();
await host.getByText('我们现在在哪一层？').waitFor();
await guest.getByText('我们现在在哪一层？').waitFor();
await host.waitForTimeout(400);
await host.screenshot({ path: pathFor('04-levels-mobile.png'), fullPage: true });

for (const page of [host, guest]) {
  await page.getByRole('button', { name: /Lv\.3 稳定/ }).click();
  await page.getByRole('button', { name: 'Lv.4', exact: true }).click();
  await page.getByRole('button', { name: /进入12个核心关卡/ }).click();
  await page.getByText('秘密保管局').waitFor();
}
await host.waitForTimeout(400);
await host.screenshot({ path: pathFor('05-assessment-mobile.png'), fullPage: true });

await host.getByRole('button', { name: '加一题' }).click();
await host.getByPlaceholder(/你最希望我改掉/).fill('你觉得我们最值得一起完成的一件事是什么？');
await host.getByRole('button', { name: /实时投递给阿哲/ }).click();
await guest.getByText('小鱼投来一道支线题').waitFor();
await guest.waitForTimeout(400);
await guest.screenshot({ path: pathFor('06-live-side-quest-mobile.png'), fullPage: true });
await guest.getByRole('button', { name: /小鱼投来一道支线题/ }).click();
await guest.waitForTimeout(400);
await guest.getByPlaceholder(/写给小鱼/).fill('一起去一个从没去过的城市。');
await guest.screenshot({ path: pathFor('07-side-question-answer-mobile.png'), fullPage: true });
await guest.getByRole('button', { name: '发出回答' }).click();
await host.getByText('阿哲已回应你的支线题').waitFor();

const completeCore = async (page) => {
  for (let index = 0; index < 12; index += 1) {
    await page.locator('.option-list button').first().click();
    await page.locator('.primary-button.sticky').click();
    await page.locator('.option-list button').first().click();
    await page.locator('.primary-button.sticky').click();
  }
};

await completeCore(host);
await host.getByText(/在轨道上等一等阿哲/).waitFor();
await completeCore(guest);
await host.getByText('你们眼中的这段友谊').waitFor();
await guest.getByText('你们眼中的这段友谊').waitFor();
await host.waitForTimeout(400);
await host.screenshot({ path: pathFor('08-results-mobile.png'), fullPage: true });

const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const desktop = await desktopContext.newPage();
attachErrors(desktop, 'desktop');
await desktop.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await desktop.screenshot({ path: pathFor('09-lobby-desktop.png'), fullPage: true });

console.log(JSON.stringify({ errors, inviteUrl }, null, 2));
await browser.close();
