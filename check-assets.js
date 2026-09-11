const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [
  'host.html', 'mando.html',
  'js/host/main.js', 'js/host/sprite-animation.js', 'js/games/pista-hielo/host-pista-hielo.js',
  'css/host.css', 'css/games/pista-hielo.css'
];
const refs = new Set();
const re = /(?:\/img\/|\/sounds\/)([A-Za-z0-9_.-]+\.(?:png|jpg|jpeg|gif|webp|mp3|wav|ogg))/g;
for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const m of text.matchAll(re)) refs.add(m[1]);
}
let bad = 0;
for (const name of refs) {
  const folder = /\.(?:mp3|wav|ogg)$/.test(name) ? 'sounds' : 'img';
  const target = path.join(root, folder, name);
  if (!fs.existsSync(target)) { console.error(`MISSING /${folder}/${name}`); bad++; }
  else console.log(`OK /${folder}/${name}`);
}
process.exitCode = bad ? 1 : 0;
