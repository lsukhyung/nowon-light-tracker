const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 통계 아이콘 생성 함수
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경 (파랑색)
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, 0, size, size);

  // 막대 그래프 (흰색)
  ctx.fillStyle = 'white';

  const barWidth = size * 0.12;
  const spacing = size * 0.18;
  const startX = size * 0.2;
  const baseY = size * 0.85;
  const cornerRadius = size * 0.02;

  // 4개의 막대
  const bars = [
    { height: size * 0.25 },
    { height: size * 0.40 },
    { height: size * 0.50 },
    { height: size * 0.60 }
  ];

  bars.forEach((bar, index) => {
    const x = startX + (index * spacing);
    const y = baseY - bar.height;

    // 둥근 모서리 사각형
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + barWidth - cornerRadius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + cornerRadius);
    ctx.lineTo(x + barWidth, y + bar.height - cornerRadius);
    ctx.quadraticCurveTo(x + barWidth, y + bar.height, x + barWidth - cornerRadius, y + bar.height);
    ctx.lineTo(x + cornerRadius, y + bar.height);
    ctx.quadraticCurveTo(x, y + bar.height, x, y + bar.height - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.fill();
  });

  return canvas;
}

// 아이콘 생성
const sizes = [192, 512, 180]; // 192: Android, 512: Android, 180: iOS
const publicDir = path.join(__dirname, '..', 'public');

// public 디렉토리 확인
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, buffer);
  console.log(`✓ Generated ${filename}`);
});

console.log('\n✅ All icons generated successfully!');
