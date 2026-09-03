/**
 * Empaqueta los módulos de js/ dentro de index.html para que el sitio
 * funcione con doble clic (file:// bloquea los módulos ES externos).
 *
 *   node build.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const ORDER = ['utils.js', 'data.js', 'galaxy.js', 'landmarks.js', 'solar.js', 'blackhole.js', 'orion.js', 'ui.js', 'main.js'];
const START = '<!-- BUILD:JS -->';
const END = '<!-- /BUILD:JS -->';

const externalImports = new Map();
const chunks = [];

for (const file of ORDER) {
  const raw = await readFile(new URL(`./js/${file}`, import.meta.url), 'utf8');

  const body = raw
    // imports entre módulos locales: se eliminan (todo comparte ámbito)
    .replace(/^import\s+[^;]*?from\s+['"]\.\/[^'"]+['"];?\s*$/gm, '')
    // imports externos (three y addons): se elevan a la cabecera, deduplicados
    .replace(/^import\s+([^;]*?)from\s+['"]([^.'"][^'"]*)['"];?\s*$/gm, (_, what, from) => {
      externalImports.set(`${what.trim()}|${from}`, `import ${what.trim()} from '${from}';`);
      return '';
    })
    .replace(/^export\s+(?=(function|const|let|class))/gm, '')
    .trim();

  chunks.push(`/* ========== ${file} ========== */\n${body}`);
}

const bundle = [...externalImports.values()].join('\n') + '\n\n' + chunks.join('\n\n');

const htmlPath = new URL('./index.html', import.meta.url);
const html = await readFile(htmlPath, 'utf8');

const a = html.indexOf(START);
const b = html.indexOf(END);
if (a === -1 || b === -1) throw new Error('Faltan los marcadores BUILD:JS en index.html');

const out = html.slice(0, a + START.length)
  + `\n<script type="module">\n${bundle}\n</script>\n`
  + html.slice(b);

await writeFile(htmlPath, out, 'utf8');
console.log(`index.html empaquetado (${(bundle.length / 1024).toFixed(1)} kB de JS en línea)`);
