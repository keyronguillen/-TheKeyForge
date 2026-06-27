#!/usr/bin/env node
/**
 * audit.js — Auditor de sitios para prospectos (clínicas / pymes Costa Rica)
 *
 * Revisa, para cada URL:
 *   1. HTTPS         — ¿usa https? ¿http redirige a https? ¿certificado válido?
 *   2. Responsive    — ¿hay <meta name="viewport" width=device-width>?
 *   3. Velocidad     — TTFB + tiempo total de descarga del HTML → puntaje 0-100
 * Y como extra, señales SEO básicas (title, meta description, H1, alt, schema).
 *
 * SIN dependencias externas — solo módulos nativos de Node (>=18).
 *
 * Uso:
 *   node audit.js https://sitio1.cr https://sitio2.com
 *   node audit.js --file urls.txt
 *   node audit.js --file urls.txt --json reporte.json --csv reporte.csv
 *
 * Si no se pasan URLs ni --file, usa tools/urls.sample.txt.
 */

'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;

/* ----------------------------- args ----------------------------- */
function parseArgs(argv) {
  const out = { urls: [], file: null, json: null, csv: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--json') out.json = argv[++i];
    else if (a === '--csv') out.csv = argv[++i];
    else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    else out.urls.push(a);
  }
  return out;
}
function printHelp() {
  console.log(`audit.js — auditor de sitios (HTTPS · responsive · velocidad)

  node audit.js <url> [url2 ...]
  node audit.js --file urls.txt [--json out.json] [--csv out.csv]`);
}

/* --------------------- carga de lista de URLs -------------------- */
function loadUrls(args) {
  let urls = [...args.urls];
  const file = args.file || (urls.length ? null : path.join(__dirname, 'urls.sample.txt'));
  if (file) {
    if (!fs.existsSync(file)) { console.error(`No existe el archivo: ${file}`); process.exit(1); }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    urls.push(...lines);
  }
  // normaliza: si no trae protocolo, prueba https primero
  return [...new Set(urls)].map(u => /^https?:\/\//i.test(u) ? u : 'https://' + u);
}

/* ------------------------- fetch con timing --------------------- */
function fetchOnce(urlStr) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr); } catch (e) { return reject(new Error('URL inválida')); }
    const lib = url.protocol === 'https:' ? https : http;
    const started = Date.now();
    let ttfb = null;

    const req = lib.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CR-SEO-Audit/1.0)' },
      // No abortamos por certificados malos: queremos detectarlos como hallazgo.
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      // Capturamos info del socket/TLS al recibir la respuesta:
      // en el evento 'end' el socket puede haber sido liberado (null).
      const sock = res.socket || {};
      const tls = !!sock.encrypted;
      const authorized = sock.authorized !== false;
      const authError = sock.authorizationError || null;
      res.once('data', () => { if (ttfb === null) ttfb = Date.now() - started; });
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1.5e6) { res.destroy(); } // tope 1.5MB de HTML
      });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        location: res.headers.location,
        ttfb: ttfb ?? (Date.now() - started),
        total: Date.now() - started,
        bytes: Buffer.byteLength(body),
        body,
        finalUrl: urlStr,
        tls,
        authorized,
        authError,
      }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

// Sigue redirecciones manualmente para detectar http→https
async function fetchFollow(urlStr) {
  let current = urlStr;
  const chain = [];
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetchOnce(current);
    chain.push({ url: current, status: res.status });
    if (res.status >= 300 && res.status < 400 && res.location) {
      current = new URL(res.location, current).href;
      continue;
    }
    res.finalUrl = current;
    res.chain = chain;
    return res;
  }
  throw new Error('demasiadas redirecciones');
}

/* ------------------------- analizadores ------------------------- */
function checkResponsive(html) {
  const m = /<meta[^>]+name=["']?viewport["']?[^>]*>/i.exec(html || '');
  if (!m) return { mobile: false, reason: 'sin meta viewport' };
  const hasDeviceWidth = /width\s*=\s*device-width/i.test(m[0]);
  return hasDeviceWidth
    ? { mobile: true, reason: 'viewport device-width' }
    : { mobile: false, reason: 'viewport sin device-width' };
}

// Puntaje de velocidad 0-100 a partir de TTFB y tiempo total (heurístico).
function speedScore(ttfb, total, bytes) {
  // referencias: TTFB ideal <200ms, malo >1500ms; total ideal <800ms, malo >5000ms
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const ttfbScore = clamp(100 - ((ttfb - 200) / (1500 - 200)) * 100);
  const totalScore = clamp(100 - ((total - 800) / (5000 - 800)) * 100);
  const sizeScore = clamp(100 - ((bytes - 50_000) / (2_000_000 - 50_000)) * 100);
  return Math.round(0.4 * ttfbScore + 0.4 * totalScore + 0.2 * sizeScore);
}

function seoSignals(html) {
  const h = html || '';
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [, ''])[1].trim();
  const desc = (/<meta[^>]+name=["']?description["']?[^>]*content=["']([^"']*)["']/i.exec(h) || [, ''])[1].trim();
  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  const imgs = (h.match(/<img[\s>]/gi) || []).length;
  const imgsNoAlt = (h.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length;
  const schema = /application\/ld\+json/i.test(h);
  const lang = (/<html[^>]+lang=["']([^"']+)["']/i.exec(h) || [, ''])[1];
  return { title: !!title, titleText: title.slice(0, 70), desc: !!desc, h1, imgs, imgsNoAlt, schema, lang };
}

/* --------------------------- auditoría -------------------------- */
async function audit(originalUrl) {
  const result = { url: originalUrl, ok: false };
  try {
    // 1) Intento principal (https si no se especificó)
    let res = await fetchFollow(originalUrl).catch(async (e) => {
      // si https falla y la URL era https forzada, probamos http
      if (/^https:/i.test(originalUrl)) {
        return fetchFollow(originalUrl.replace(/^https:/i, 'http:'));
      }
      throw e;
    });

    const finalIsHttps = /^https:/i.test(res.finalUrl);
    const startedHttp = /^http:/i.test(originalUrl);
    const upgraded = startedHttp && finalIsHttps;

    const resp = checkResponsive(res.body);
    const spScore = speedScore(res.ttfb, res.total, res.bytes);
    const seo = seoSignals(res.body);

    result.ok = res.status >= 200 && res.status < 400;
    result.finalUrl = res.finalUrl;
    result.status = res.status;

    result.https = {
      pass: finalIsHttps && res.authorized,
      finalIsHttps,
      certValid: res.authorized,
      certError: res.authError,
      upgradesFromHttp: upgraded,
    };
    result.mobile = resp;
    result.speed = { ttfb: res.ttfb, total: res.total, bytes: res.bytes, score: spScore };
    result.seo = seo;

    // puntaje global ponderado (proxy de "qué tan mal está")
    result.overall = Math.round(
      (result.https.pass ? 30 : 0) +
      (resp.mobile ? 25 : 0) +
      (spScore / 100) * 25 +
      (seo.title ? 5 : 0) + (seo.desc ? 5 : 0) +
      (seo.h1 > 0 ? 4 : 0) + (seo.schema ? 4 : 0) +
      (seo.imgs > 0 && seo.imgsNoAlt === 0 ? 2 : 0)
    );
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

/* --------------------------- salida ----------------------------- */
const C = { g: s => `\x1b[32m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m`,
            y: s => `\x1b[33m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m` };
const mark = ok => (ok ? C.g('✓') : C.r('✗'));

function printRow(r) {
  if (r.error) {
    console.log(`${C.r('✗')} ${C.b(r.url)}  ${C.dim('— ' + r.error)}`);
    return;
  }
  const scoreCol = r.overall >= 60 ? C.g : r.overall >= 35 ? C.y : C.r;
  console.log(`${mark(r.ok)} ${C.b(r.finalUrl)}  ${scoreCol(C.b(r.overall + '/100'))}`);
  console.log(`   HTTPS ${mark(r.https.pass)} ${C.dim(
      (r.https.upgradesFromHttp ? 'http→https ' : '') +
      (r.https.certValid ? '' : 'cert inválido ') +
      (r.https.finalIsHttps ? '' : 'final en HTTP'))}`);
  console.log(`   Móvil ${mark(r.mobile.mobile)} ${C.dim(r.mobile.reason)}`);
  console.log(`   Velocidad ${r.speed.score >= 60 ? C.g(r.speed.score) : r.speed.score >= 35 ? C.y(r.speed.score) : C.r(r.speed.score)}/100 ` +
      C.dim(`(TTFB ${r.speed.ttfb}ms · total ${r.speed.total}ms · ${(r.speed.bytes/1024).toFixed(0)}KB)`));
  console.log(`   SEO ${C.dim(`title:${r.seo.title?'✓':'✗'} desc:${r.seo.desc?'✓':'✗'} h1:${r.seo.h1} ` +
      `img-sin-alt:${r.seo.imgsNoAlt}/${r.seo.imgs} schema:${r.seo.schema?'✓':'✗'} lang:${r.seo.lang||'—'}`)}`);
  console.log('');
}

function toCSV(results) {
  const head = ['url','final_url','ok','overall','https_pass','cert_valid','upgrades_https',
    'mobile_friendly','mobile_reason','speed_score','ttfb_ms','total_ms','bytes',
    'title','description','h1','imgs_no_alt','imgs','schema','error'];
  const esc = v => /[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g,'""') + '"' : (v ?? '');
  const lines = results.map(r => [
    r.url, r.finalUrl||'', r.ok?'si':'no', r.overall??'',
    r.https?.pass?'si':'no', r.https?.certValid?'si':'no', r.https?.upgradesFromHttp?'si':'no',
    r.mobile?.mobile?'si':'no', r.mobile?.reason||'',
    r.speed?.score??'', r.speed?.ttfb??'', r.speed?.total??'', r.speed?.bytes??'',
    r.seo?.title?'si':'no', r.seo?.desc?'si':'no', r.seo?.h1??'', r.seo?.imgsNoAlt??'', r.seo?.imgs??'',
    r.seo?.schema?'si':'no', r.error||''
  ].map(esc).join(','));
  return head.join(',') + '\n' + lines.join('\n');
}

/* ---------------------------- main ------------------------------ */
(async () => {
  const args = parseArgs(process.argv.slice(2));
  const urls = loadUrls(args);
  if (!urls.length) { printHelp(); process.exit(1); }

  console.log(C.b(`\n🔎 Auditando ${urls.length} sitio(s)…\n`));
  const results = [];
  for (const u of urls) {
    const r = await audit(u);
    results.push(r);
    printRow(r);
  }

  // Resumen
  const done = results.filter(r => !r.error);
  const avg = k => done.length ? Math.round(done.reduce((a, r) => a + (k(r)||0), 0) / done.length) : 0;
  console.log(C.b('── Resumen ──'));
  console.log(`Auditados: ${results.length}  ·  Con error: ${results.filter(r=>r.error).length}`);
  console.log(`Sin HTTPS válido: ${done.filter(r=>!r.https.pass).length}  ·  ` +
              `No responsive: ${done.filter(r=>!r.mobile.mobile).length}  ·  ` +
              `Velocidad < 50: ${done.filter(r=>r.speed.score<50).length}`);
  console.log(`Puntaje global promedio: ${avg(r=>r.overall)}/100\n`);

  if (args.json) { fs.writeFileSync(args.json, JSON.stringify(results, null, 2)); console.log('JSON →', args.json); }
  if (args.csv)  { fs.writeFileSync(args.csv, toCSV(results)); console.log('CSV  →', args.csv); }
})().catch(e => { console.error('Error fatal:', e); process.exit(1); });
