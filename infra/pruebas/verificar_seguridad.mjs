// Verificación externa de los controles de seguridad del SGRC (Anexo F, Parte 14).
// Revisa desde fuera, sin credenciales, lo que cualquiera en internet puede ver:
// TLS, puertos, SSH, webhook de n8n, RLS sin sesión, Edge Function, endpoints de
// salud, política de privacidad, CI y dependencias. Genera un informe en Markdown.
//
// Uso (desde la raíz del repositorio):
//   node infra/pruebas/verificar_seguridad.mjs > evidencia_seguridad_AAAA-MM-DD.md
import tls from 'node:tls';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const sh = promisify(execFile);
const DOMINIOS = ['crm.orlandopa.dev', 'n8n.orlandopa.dev', 'chatwoot.orlandopa.dev', 'wxtzfhqfckrjbznvqtfy.supabase.co'];
const VPS = ['n8n.orlandopa.dev', 'chatwoot.orlandopa.dev'];
const PUERTOS = [21, 22, 25, 80, 443, 2375, 3000, 3306, 5432, 5678, 6379, 8080, 8443, 9000, 9443, 27017];
const PERMITIDOS = new Set([22, 80, 443]);
const WEBHOOK = 'https://n8n.orlandopa.dev/webhook/chatwoot';
const REPO = 'OrlandoPa/CRM_TallerInt';

const filas = [];
let fallas = 0;
const anotar = (control, prueba, ok, detalle) => {
  if (ok === false) fallas++;
  filas.push(`| ${control} | ${prueba} | ${ok === null ? 'ℹ️' : ok ? '✅' : '❌'} | ${String(detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`);
};

const versionTls = (host, version) => new Promise((resolve) => {
  const s = tls.connect({ host, port: 443, servername: host, minVersion: version, maxVersion: version, timeout: 8000 }, () => {
    const r = s.getProtocol(); s.end(); resolve(r);
  });
  s.on('error', () => resolve(null));
  s.on('timeout', () => { s.destroy(); resolve(null); });
});

const puertoAbierto = (host, port) => new Promise((resolve) => {
  const s = net.connect({ host, port, timeout: 3000 }, () => { s.destroy(); resolve(true); });
  s.on('error', () => resolve(false));
  s.on('timeout', () => { s.destroy(); resolve(false); });
});

const http = async (url, init = {}) => {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    return { status: r.status, texto: await r.text() };
  } catch (e) {
    return { status: 0, texto: e.message };
  }
};

// 1. TLS
for (const d of DOMINIOS) {
  const v = {};
  for (const ver of ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3']) v[ver] = await versionTls(d, ver);
  const ok = !v['TLSv1'] && !v['TLSv1.1'] && v['TLSv1.2'] && v['TLSv1.3'];
  anotar('RNF-SEG-01 / BE-10', `TLS de ${d}`, ok, Object.entries(v).map(([k, x]) => `${k}: ${x ? 'acepta' : 'rechaza'}`).join(', '));
}

// 2. Puertos y SSH de los VPS
for (const h of VPS) {
  const abiertos = [];
  for (const p of PUERTOS) if (await puertoAbierto(h, p)) abiertos.push(p);
  const extra = abiertos.filter((p) => !PERMITIDOS.has(p));
  anotar('BE-17 / RNF-SEG-09', `Puertos abiertos en ${h} (${PUERTOS.length} revisados)`, extra.length === 0, `abiertos: ${abiertos.join(', ') || 'ninguno'}${extra.length ? `; sobran: ${extra.join(', ')}` : ''}`);
  try {
    await sh('ssh', ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'PreferredAuthentications=none', '-o', 'ConnectTimeout=8', `sondeo@${h}`, 'true'], { timeout: 20000 });
    anotar('BE-17 / RNF-SEG-09', `SSH de ${h}`, false, 'aceptó una conexión sin autenticación');
  } catch (e) {
    const m = String(e.stderr || e.message).match(/Permission denied \(([^)]*)\)/);
    anotar('BE-17 / RNF-SEG-09', `Métodos de SSH en ${h}`, m ? !/password|keyboard/.test(m[1]) : null, m ? m[1] : 'no se pudo consultar (¿ssh instalado?)');
  }
}

// 3. Webhook de n8n: payloads sin firma válida
const cuerpo = JSON.stringify({ event: 'message_created', message_type: 'incoming', content: 'PRUEBA DE SEGURIDAD', sender: { phone_number: '+51900000000' }, conversation: { id: 0 } });
const ts = String(Math.floor(Date.now() / 1000));
for (const [nombre, headers] of [
  ['sin firma', {}],
  ['firma inventada', { 'X-Chatwoot-Timestamp': ts, 'X-Chatwoot-Signature': 'sha256=' + '0'.repeat(64) }],
  ['firmado con otro secreto', { 'X-Chatwoot-Timestamp': ts, 'X-Chatwoot-Signature': 'sha256=' + crypto.createHmac('sha256', 'otro').update(`${ts}.${cuerpo}`).digest('hex') }]
]) {
  const r = await http(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: cuerpo });
  anotar('BE-08 / RF-SEG-01', `Webhook n8n: payload ${nombre}`, r.status === 401 || r.status === 403, `HTTP ${r.status}`);
}

// 4. RLS sin sesión y Edge Function
const env = Object.fromEntries(fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]));
const SB = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
for (const t of ['pacientes', 'citas', 'mensajes_whatsapp', 'tratamientos_cita', 'auditoria', 'usuarios_autorizados', 'servicios', 'horario_atencion', 'feriados', 'bloqueos_agenda']) {
  const r = await http(`${SB}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  const ok = r.status === 401 || r.status === 403 || (r.status === 200 && r.texto.trim() === '[]');
  anotar('BE-01 / RF-SEG-03', `API sin sesión: ${t}`, ok, `HTTP ${r.status} ${r.texto.slice(0, 60)}`);
}
for (const fn of ['mi_perfil', 'retencion_candidatos', 'retencion_purgar']) {
  const r = await http(`${SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: '{}' });
  anotar('BE-01 / RF-SEG-03', `RPC sin sesión: ${fn}`, r.status >= 400, `HTTP ${r.status}`);
}
const ef = await http(`${SB}/functions/v1/agenda`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'listar_eventos' }) });
anotar('BE-05', 'Edge Function agenda sin sesión', ef.status === 401 || ef.status === 403, `HTTP ${ef.status}`);

// 5. Disponibilidad y política
const n8n = await http('https://n8n.orlandopa.dev/healthz/readiness');
anotar('BE-18', 'n8n /healthz/readiness', n8n.status === 200 && n8n.texto.includes('"ok"'), `HTTP ${n8n.status} ${n8n.texto.slice(0, 40)}`);
const cw = await http('https://chatwoot.orlandopa.dev/api');
anotar('BE-18', 'Chatwoot /api', cw.status === 200 && cw.texto.includes('"data_services":"ok"'), `HTTP ${cw.status} ${cw.texto.slice(0, 120)}`);
const crm = await http('https://crm.orlandopa.dev/');
anotar('FE-04', 'CRM publicado por HTTPS', crm.status === 200, `HTTP ${crm.status}`);
const pol = await http('https://crm.orlandopa.dev/privacidad.html');
anotar('FE-06 / RNF-SEG-02', 'Política de privacidad pública', pol.status === 200 && /Versión 2/.test(pol.texto) && /Tratamiento o indicaciones/.test(pol.texto), `HTTP ${pol.status}`);
const sec = await http('https://crm.orlandopa.dev/assets/');
anotar('FE-03', 'Listado de archivos del CRM deshabilitado', sec.status !== 200 || !/Index of/i.test(sec.texto), `HTTP ${sec.status}`);

// 6. Secretos en el bundle del CRM
const html = crm.texto || '';
// El HTML enlaza el JS principal; ese archivo importa los fragmentos que se cargan bajo demanda
const js = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]));
let bundle = '';
for (const p of [...js]) {
  const t = (await http(`https://crm.orlandopa.dev${p}`)).texto;
  bundle += t;
  for (const m of t.matchAll(/["'`](?:\.\/|\/assets\/)?([\w.-]+\.js)["'`]/g)) js.add(`/assets/${m[1]}`);
}
const patrones = { 'clave service_role': /service_role/, 'token de Chatwoot': /api_access_token/i, 'secreto de Google': /GOCSPX-/, 'refresh token de Google': /1\/\/0[A-Za-z0-9_-]{20,}/, 'clave privada': /-----BEGIN [A-Z ]*PRIVATE KEY-----/ };
const hallados = Object.entries(patrones).filter(([, re]) => re.test(bundle)).map(([n]) => n);
anotar('FE-03 / RF-SEG-04', `Secretos en el bundle (${js.size} archivo(s) JS)`, js.size > 0 && hallados.length === 0, hallados.length ? `encontrado: ${hallados.join(', ')}` : 'ninguno de los patrones buscados');

// 7. CI y dependencias
const ci = await http(`https://api.github.com/repos/${REPO}/actions/runs?per_page=1&branch=main`);
try {
  const r = JSON.parse(ci.texto).workflow_runs[0];
  anotar('IM-02', 'Último CI de main', r.conclusion === 'success', `${r.head_sha.slice(0, 7)} ${r.status} ${r.conclusion} (${r.created_at})`);
} catch { anotar('IM-02', 'Último CI de main', null, 'no se pudo consultar'); }
try {
  const { stdout } = await sh(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], { shell: process.platform === 'win32', maxBuffer: 1e7 }).catch((e) => e);
  const v = JSON.parse(stdout).metadata.vulnerabilities;
  anotar('IM-10 / RNF-SEG-10', 'npm audit (todas las dependencias)', v.high + v.critical === 0, `críticas ${v.critical}, altas ${v.high}, moderadas ${v.moderate}, bajas ${v.low}`);
} catch (e) { anotar('IM-10 / RNF-SEG-10', 'npm audit', null, `no se pudo ejecutar: ${e.message}`); }

console.log(`# Evidencia de verificación externa de seguridad\n\nFecha: ${new Date().toISOString()} · Generado por \`infra/pruebas/verificar_seguridad.mjs\`\n`);
console.log('| Control | Prueba | Resultado | Detalle |\n|---|---|:---:|---|');
console.log(filas.join('\n'));
console.log(`\n**${fallas === 0 ? 'Todas las verificaciones correctas.' : `${fallas} verificación(es) con falla.`}** ✅ correcto · ❌ falla · ℹ️ informativo`);
process.exit(fallas ? 1 : 0);
