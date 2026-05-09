// Sube variables de .env.local a Vercel (production, preview, development).
// NEXT_PUBLIC_SITE_URL se sobreescribe a https://scentualbliss.vercel.app
// en production/preview porque localhost no aplica allá.
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const env = readFileSync('.env.local', 'utf8')
  .split('\n')
  .filter(l => l && !l.startsWith('#') && l.includes('='))
  .reduce((acc, line) => {
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    acc[key] = val;
    return acc;
  }, {});

// No subir esta — ya no la usamos (precios son COP nativo)
delete env.NEXT_PUBLIC_USD_TO_COP_RATE;

const overrides = {
  production: { NEXT_PUBLIC_SITE_URL: 'https://scentualbliss.vercel.app' },
  preview:    { NEXT_PUBLIC_SITE_URL: 'https://scentualbliss.vercel.app' },
};

for (const [key, baseVal] of Object.entries(env)) {
  for (const target of ['production', 'preview', 'development']) {
    const val = overrides[target]?.[key] ?? baseVal;
    process.stdout.write(`  ${target.padEnd(11)} ${key}... `);
    try {
      // echo VAL | vercel env add KEY TARGET
      execSync(`vercel env add ${key} ${target}`, {
        input: val + '\n',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log('✓');
    } catch (e) {
      const msg = (e.stderr?.toString() || e.message).split('\n')[0].slice(0, 80);
      console.log(`✗  ${msg}`);
    }
  }
}
console.log('\nDone.');
