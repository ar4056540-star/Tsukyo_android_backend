const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const sourceImage = path.resolve('./src/assets/images/vybe_app_icon_1788230262853.jpg');
  const resDir = path.resolve('./android/app/src/main/res');

  const densities = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  console.log('Generating Android Mipmap Icons from:', sourceImage);

  for (const { dir, size } of densities) {
    const targetDir = path.join(resDir, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Square launcher icon
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher icon with circular crop
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#000" /></svg>`
    );

    await sharp(sourceImage)
      .resize(size, size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`Generated ${dir} (${size}x${size})`);
  }

  // Generate 512x512 foreground / high-res icon in drawable
  const drawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawableDir)) {
    fs.mkdirSync(drawableDir, { recursive: true });
  }

  await sharp(sourceImage)
    .resize(512, 512)
    .png()
    .toFile(path.join(drawableDir, 'ic_launcher_foreground.png'));

  // Also copy to public for web branding
  await sharp(sourceImage)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('./public/vybe-icon.png'));

  // Create adaptive icon XML definitions
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anyDpiDir)) {
    fs.mkdirSync(anyDpiDir, { recursive: true });
  }

  const icLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/vybe_dark_bg"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;

  const icLauncherRoundXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/vybe_dark_bg"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;

  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), icLauncherXml);
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), icLauncherRoundXml);

  console.log('All Android Launcher Icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
