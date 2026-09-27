// Métrica ND (Nivel de Desacoplamiento, OE2) del front.
//
// ND = módulos fuera de la capa de servicios que NO acceden directamente a un
//      servicio externo / total de módulos fuera de la capa de servicios × 100
//
// La capa de servicios (src/services) es la única que debería hablar con
// Supabase, Google o el almacenamiento del navegador; el resto usa sus funciones.
// El cálculo es estático (lee el código fuente), así que se repite en cada `npm test`.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const CAPA_SERVICIOS = path.join(SRC, 'services');

// Señales de acceso directo a un servicio externo
const ACCESOS_EXTERNOS = [
  { nombre: 'SDK de Supabase', patron: /@supabase\/supabase-js/ },
  { nombre: 'fetch', patron: /\bfetch\s*\(/ },
  { nombre: 'API de Google', patron: /googleapis\.com|accounts\.google\.com/ },
  { nombre: 'localStorage', patron: /\blocalStorage\./ },
];

const listarModulos = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return listarModulos(ruta);
    return /\.(js|jsx)$/.test(e.name) && !/\.test\.(js|jsx)$/.test(e.name) ? [ruta] : [];
  });

const calcularND = () => {
  const modulos = listarModulos(SRC).filter((m) => !m.startsWith(CAPA_SERVICIOS));
  const acoplados = modulos
    .map((m) => {
      const codigo = fs.readFileSync(m, 'utf8');
      const accesos = ACCESOS_EXTERNOS.filter((a) => a.patron.test(codigo)).map((a) => a.nombre);
      return { modulo: path.relative(SRC, m).replace(/\\/g, '/'), accesos };
    })
    .filter((m) => m.accesos.length > 0);
  const nd = ((modulos.length - acoplados.length) / modulos.length) * 100;
  return { total: modulos.length, acoplados, nd };
};

describe('Nivel de Desacoplamiento (ND, OE2)', () => {
  it('al menos el 90 % de los módulos accede a servicios externos solo a través de src/services', () => {
    const { total, acoplados, nd } = calcularND();
    console.log(
      `ND = ${total - acoplados.length}/${total} = ${nd.toFixed(1)} %` +
        acoplados.map((a) => `\n  acceso directo: ${a.modulo} (${a.accesos.join(', ')})`).join('')
    );
    expect(total).toBeGreaterThan(0);
    expect(nd).toBeGreaterThanOrEqual(90);
  });
});
