#!/usr/bin/env node
/**
 * Presupuesto de tamaño del CRM (software verde, RNF-VERDE-07).
 * Se ejecuta en el CI después de `npm run build` y falla si el JavaScript y el
 * CSS que el navegador descarga al abrir el CRM superan el presupuesto.
 * Tamaños en KB comprimidos con gzip (lo que viaja por la red).
 *
 * Uso: node scripts/presupuesto_bundle.mjs [dist]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const PRESUPUESTO_KB = {
  carga_inicial: 160, // JS y CSS que enlaza index.html (medido el 11/11/2026: 144.5 KB)
  total: 200 //          todos los archivos de assets/, incluidas las vistas diferidas
};

const dist = process.argv[2] || 'dist';
const kb = (archivo) => gzipSync(readFileSync(join(dist, archivo))).length / 1024;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const iniciales = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
const todos = readdirSync(join(dist, 'assets')).filter(f => /\.(js|css)$/.test(f)).map(f => `assets/${f}`);

const medido = {
  carga_inicial: iniciales.reduce((s, f) => s + kb(f), 0),
  total: todos.reduce((s, f) => s + kb(f), 0)
};

let falla = false;
for (const [clave, limite] of Object.entries(PRESUPUESTO_KB)) {
  const ok = medido[clave] <= limite;
  falla ||= !ok;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${clave}: ${medido[clave].toFixed(1)} KB (presupuesto ${limite} KB)`);
}
if (iniciales.length === 0) {
  console.log('FALLA no se encontraron archivos enlazados en index.html');
  falla = true;
}
process.exit(falla ? 1 : 0);
