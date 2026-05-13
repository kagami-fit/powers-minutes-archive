import sharp from "sharp";

const [sourcePath, logoPath, outputPath] = process.argv.slice(2);

if (!sourcePath || !logoPath || !outputPath) {
  console.error("Usage: node scripts/brand-diagram.js <source.png> <logo.png> <output.png>");
  process.exit(1);
}

const source = sharp(sourcePath);
const metadata = await source.metadata();
const cropY = 132;
const headerHeight = 216;
const bodyHeight = metadata.height - cropY;

const bodyBuffer = await sharp(sourcePath)
  .extract({ left: 0, top: cropY, width: metadata.width, height: bodyHeight })
  .png()
  .toBuffer();

const logoBuffer = await sharp(logoPath).resize({ height: 145 }).png().toBuffer();
const headerBuffer = Buffer.from(`
<svg width="${metadata.width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="640" y="88" font-family="-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif" font-size="42" font-weight="800" fill="#071734">集客・HP方針MTG</text>
  <line x1="0" y1="194" x2="${metadata.width}" y2="194" stroke="#071734" stroke-width="3"/>
  <line x1="1318" y1="38" x2="1318" y2="124" stroke="#071734" stroke-width="3"/>
  <text x="1368" y="88" font-family="-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif" font-size="36" font-weight="800" fill="#071734">2026/05/13</text>
</svg>`);

await sharp({
  create: {
    width: metadata.width,
    height: headerHeight + bodyHeight,
    channels: 4,
    background: "#ffffff",
  },
})
  .composite([
    { input: headerBuffer, left: 0, top: 0 },
    { input: logoBuffer, left: 48, top: 30 },
    { input: bodyBuffer, left: 0, top: headerHeight },
  ])
  .png()
  .toFile(outputPath);

console.log(`Wrote ${outputPath}`);
