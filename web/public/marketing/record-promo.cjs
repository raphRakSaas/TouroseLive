const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

async function main() {
  const root = path.resolve(__dirname);
  const outDir = path.join(root, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const promoUrl = 'http://127.0.0.1:4177/marketing/promo-linkedin.html';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outDir,
      size: { width: 1080, height: 1080 },
    },
  });

  const page = await context.newPage();
  await page.goto(promoUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.body.dataset.done === '1', null, {
    timeout: 45000,
  });
  await page.waitForTimeout(800);
  await context.close();
  await browser.close();

  const files = fs
    .readdirSync(outDir)
    .filter((name) => name.endsWith('.webm'))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(outDir, name)).mtimeMs,
    }))
    .sort((left, right) => right.mtime - left.mtime);

  if (!files.length) {
    throw new Error('No webm recorded');
  }

  const webmPath = path.join(outDir, files[0].name);
  const mp4Path = path.join(outDir, 'tourose-linkedin-promo.mp4');

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      webmPath,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      mp4Path,
    ],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error('ffmpeg failed');
  }

  console.log(mp4Path);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
