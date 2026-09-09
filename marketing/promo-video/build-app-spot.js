// Baut promo-app.html aus der Vorlage: Schriften und Bildschirmfotos werden
// als Base64 eingesetzt, damit die fertige Datei allein lauffähig ist.
//
//   node build-app-spot.js
//
// Neue Screenshots? capture-screens.js laufen lassen (oder eigene Bilder mit
// demselben Dateinamen nach screens/ legen), dann dieses Skript.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const template = fs.readFileSync(path.join(DIR, 'promo-app.template.html'), 'utf8');

// Die @font-face-Regeln stehen schon eingebettet im ersten Spot - von dort
// übernehmen, statt sie zweimal zu pflegen.
const promo = fs.readFileSync(path.join(DIR, 'promo.html'), 'utf8');
const faces = promo.match(/@font-face\{[^}]*\}/g);
if (!faces) {
  console.error('Keine eingebetteten Schriften in promo.html gefunden.');
  process.exit(1);
}

let out = template.replace('{{FONTS}}', faces.join('\n'));

out = out.replace(/\{\{SCREEN:([\w-]+)\}\}/g, (_, name) => {
  const file = path.join(DIR, 'screens', name + '.png');
  if (!fs.existsSync(file)) {
    console.error('Fehlt: screens/' + name + '.png — zuerst capture-screens.js laufen lassen.');
    process.exit(1);
  }
  return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
});

const target = path.join(DIR, 'promo-app.html');
fs.writeFileSync(target, out);
console.log('promo-app.html geschrieben, ' + Math.round(out.length / 1024) + ' KB');
