import fs from 'fs';

const filePath = 'c:/webApp/connexy/v1.0.0/src/pages/MessagePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);
let startIdx = -1;
let endIdx = -1;

for (let i = 2170; i < 2210; i++) {
  if (lines[i] && lines[i].includes('bottom: 0,')) {
    startIdx = i;
    break;
  }
}

for (let i = startIdx + 1; i < startIdx + 100; i++) {
  if (lines[i] && lines[i].trim() === ')}') {
    endIdx = i;
    break;
  }
}

console.log('startIdx:', startIdx, lines[startIdx]);
console.log('endIdx:', endIdx, lines[endIdx]);

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1);
  fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
  console.log('Successfully cleaned up MessagePage.tsx');
} else {
  console.log('Could not find start or end index.');
}
