#!/usr/bin/env node
// ============================================================================
// LectorIA · calibrar.js — calibración del motor con las correcciones docentes
//
// Compara lo que propone el motor (motor.js) con lo que el docente confirmó o
// corrigió en verificar.html (tipo_verificado), y opcionalmente busca los
// umbrales que maximizan el acuerdo. Solo usa sesiones con estado='verificada'
// que tengan su entrada cruda (.raw.json) en Storage — las anteriores al
// motor v3.3 no la tienen y se omiten.
//
// Uso (PowerShell, Node 18+ — no necesita npm install):
//   $env:SUPABASE_URL         = "https://xxxx.supabase.co"
//   $env:SUPABASE_SERVICE_KEY = "<clave service_role>"    (Settings → API)
//   node calibrar.js              → informe con los umbrales actuales
//   node calibrar.js --buscar     → además busca umbrales mejores y los imprime
//
// Si la búsqueda encuentra umbrales mejores, el resultado se pega a mano en
// UMBRALES_DEFECTO de motor.js (y se vuelve a ejecutar esto para confirmar).
// La clave service_role se salta el RLS: NO subirla a git ni a Vercel.
// ============================================================================
"use strict";
const motor = require("./motor.js");

const URL_BASE = process.env.SUPABASE_URL;
const CLAVE    = process.env.SUPABASE_SERVICE_KEY;
const BUSCAR   = process.argv.includes("--buscar");

if (!URL_BASE || !CLAVE) {
  console.error("Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_KEY.");
  console.error('PowerShell:  $env:SUPABASE_URL = "https://xxxx.supabase.co"');
  console.error('             $env:SUPABASE_SERVICE_KEY = "<clave service_role>"');
  process.exit(1);
}

const CABECERAS = { apikey: CLAVE, Authorization: "Bearer " + CLAVE };

// Tipos que puede llevar una palabra del texto de referencia (idx >= 0).
// Las adiciones (idx = -1) no se comparan palabra a palabra: al cambiar los
// umbrales cambia el alineamiento y no hay forma fiable de emparejarlas.
const TIPOS_REF = ["correcta","omision","omision_dudosa","no_leida",
                   "sustitucion","inversion","repeticion","rectificacion","vacilacion"];

// Espacio de búsqueda: valores candidatos para cada umbral (ver motor.js)
const ESPACIO = {
  accSustitucion:    [35, 40, 45, 50, 55, 60],
  lenFonSustitucion: [3, 4, 5],
  rectAccMal:        [35, 40, 45, 50],
  rectAccBien:       [60, 65, 70, 75],
  simFalsoComienzo:  [0.45, 0.5, 0.55, 0.6, 0.65],
  pausaMinTicks:     [6000000, 8000000, 10000000, 12000000],
  pausaMult:         [2, 2.5, 3, 3.5, 4],
  pausaPuntMinTicks: [15000000, 20000000, 25000000],
  pausaPuntMult:     [2, 2.5, 3],
  nwGap:             [-0.45, -0.5, -0.55, -0.6, -0.65],
  solapeTicks:       [300000, 500000, 800000]
};

// ─── Acceso a Supabase (REST y Storage a pelo, sin dependencias) ─────────────
async function rest(consulta) {
  const res = await fetch(URL_BASE + "/rest/v1/" + consulta, { headers: CABECERAS });
  if (!res.ok) throw new Error("REST " + consulta.split("?")[0] + " → HTTP " + res.status + ": " + await res.text());
  return res.json();
}

async function descargarRaw(userId, sesionId) {
  const res = await fetch(URL_BASE + "/storage/v1/object/audios/" + userId + "/" + sesionId + ".raw.json",
                          { headers: CABECERAS });
  if (!res.ok) return null;   // sesión anterior al motor v3.3 (sin crudo)
  return res.json();
}

// ─── Carga de casos: entrada cruda del motor + verdad-terreno del docente ────
async function cargarCasos() {
  const sesiones = await rest("sesiones?estado=eq.verificada&select=id,user_id,texto_titulo,fecha&order=fecha");
  const casos = [];
  let sinRaw = 0;
  for (const s of sesiones) {
    const raw = await descargarRaw(s.user_id, s.id);
    if (!raw || !raw.entrada) { sinRaw++; continue; }
    const filas = await rest("sesion_palabras?sesion_id=eq." + s.id +
                             "&select=idx,tipo_ia,tipo_verificado&order=id");
    // Verdad-terreno: lo corregido por el docente; lo no tocado se considera
    // confirmado (la sesión entera está marcada como verificada).
    const verdad = new Map();
    for (const f of filas) {
      if (f.idx >= 0) verdad.set(f.idx, f.tipo_verificado || f.tipo_ia);
    }
    if (verdad.size > 0) casos.push({ id: s.id, titulo: s.texto_titulo, entrada: raw.entrada, verdad });
  }
  return { casos, sinRaw, totalVerificadas: sesiones.length };
}

// ─── Evaluación: matriz de confusión y F1 por tipo ───────────────────────────
function evaluar(casos, umbrales) {
  const matriz = {};   // matriz[verdad][prediccion] = nº de palabras
  let aciertos = 0, total = 0;
  for (const caso of casos) {
    const res = motor.analizar(caso.entrada, umbrales);
    for (const d of res.detallePalabras) {
      if (d.idx < 0) continue;
      const v = caso.verdad.get(d.idx);
      if (v == null) continue;
      (matriz[v] = matriz[v] || {})[d.tipo_ia] = (matriz[v]?.[d.tipo_ia] || 0) + 1;
      if (v === d.tipo_ia) aciertos++;
      total++;
    }
  }
  // F1 por tipo (sobre los tipos que aparecen en la verdad-terreno)
  const porTipo = {};
  let sumaF1 = 0, nTipos = 0;
  for (const t of TIPOS_REF) {
    const vp     = matriz[t]?.[t] || 0;
    const reales = Object.values(matriz[t] || {}).reduce((a, b) => a + b, 0);
    let preds = 0;
    for (const v of Object.keys(matriz)) preds += matriz[v][t] || 0;
    if (reales === 0 && preds === 0) continue;
    const prec = preds  > 0 ? vp / preds  : 0;
    const rec  = reales > 0 ? vp / reales : 0;
    const f1   = (prec + rec) > 0 ? 2 * prec * rec / (prec + rec) : 0;
    porTipo[t] = { reales, preds, vp, prec, rec, f1 };
    if (reales > 0) { sumaF1 += f1; nTipos++; }
  }
  return { matriz, aciertos, total, porTipo,
           acierto: total > 0 ? aciertos / total : 0,
           macroF1: nTipos > 0 ? sumaF1 / nTipos : 0 };
}

// Puntuación a maximizar: macro-F1 (que los tipos raros pesen) con el
// acierto global como desempate.
const puntuar = ev => ev.macroF1 * 1000 + ev.acierto;

// ─── Búsqueda por descenso coordinado ────────────────────────────────────────
function buscarUmbrales(casos) {
  let mejores = { ...motor.UMBRALES_DEFECTO };
  let mejorPunt = puntuar(evaluar(casos, mejores));
  let huboMejora = true, pasada = 0;
  while (huboMejora && pasada < 4) {
    huboMejora = false; pasada++;
    for (const [param, valores] of Object.entries(ESPACIO)) {
      for (const v of valores) {
        if (v === mejores[param]) continue;
        const p = puntuar(evaluar(casos, { ...mejores, [param]: v }));
        if (p > mejorPunt + 1e-9) {
          console.log(`  pasada ${pasada}: ${param} ${mejores[param]} → ${v}  (macro-F1 ${(p/1000).toFixed(4)})`);
          mejores = { ...mejores, [param]: v };
          mejorPunt = p;
          huboMejora = true;
        }
      }
    }
  }
  return mejores;
}

// ─── Informe ─────────────────────────────────────────────────────────────────
function imprimirInforme(ev, titulo) {
  console.log("\n══ " + titulo + " ══");
  console.log(`Palabras comparadas: ${ev.total} · acuerdo global: ${(ev.acierto*100).toFixed(1)}% · macro-F1: ${ev.macroF1.toFixed(3)}`);
  console.log("\nPor tipo (según el docente):");
  console.log("  tipo             reales  predichas  aciertos  precisión  recall    F1");
  for (const [t, x] of Object.entries(ev.porTipo)) {
    console.log("  " + t.padEnd(16) + String(x.reales).padStart(6) + String(x.preds).padStart(11) +
                String(x.vp).padStart(10) + (x.prec*100).toFixed(0).padStart(10) + "%" +
                (x.rec*100).toFixed(0).padStart(8) + "%" + x.f1.toFixed(2).padStart(8));
  }
  console.log("\nConfusiones más frecuentes (docente → motor):");
  const conf = [];
  for (const [v, fila] of Object.entries(ev.matriz))
    for (const [p, n] of Object.entries(fila))
      if (v !== p) conf.push({ v, p, n });
  conf.sort((a, b) => b.n - a.n).slice(0, 10)
      .forEach(c => console.log(`  ${c.v} → ${c.p}: ${c.n}`));
  if (conf.length === 0) console.log("  (ninguna: acuerdo total)");
}

// ─── Programa principal ──────────────────────────────────────────────────────
(async () => {
  console.log("LectorIA · calibración del " + motor.VERSION);
  console.log("Descargando sesiones verificadas de Supabase...");
  const { casos, sinRaw, totalVerificadas } = await cargarCasos();
  console.log(`Sesiones verificadas: ${totalVerificadas} · con entrada cruda: ${casos.length}` +
              (sinRaw > 0 ? ` · omitidas por no tener .raw.json (anteriores a v3.3): ${sinRaw}` : ""));
  if (casos.length === 0) {
    console.log("\nNo hay nada que calibrar todavía. Hacen falta sesiones que:");
    console.log("  1. se hayan grabado con el motor v3.3 (suben el .raw.json a Storage), y");
    console.log("  2. el docente haya verificado en verificar.html (estado='verificada').");
    process.exit(0);
  }
  if (casos.length < 10) {
    console.log("⚠ Con menos de ~10 sesiones el resultado es solo orientativo: no ajustar umbrales aún.");
  }

  const base = evaluar(casos, null);
  imprimirInforme(base, "Umbrales actuales (UMBRALES_DEFECTO de motor.js)");

  if (!BUSCAR) {
    console.log("\n(ejecuta con --buscar para buscar umbrales mejores)");
    return;
  }

  console.log("\n══ Búsqueda de umbrales (descenso coordinado) ══");
  const mejores = buscarUmbrales(casos);
  const evMejor = evaluar(casos, mejores);
  imprimirInforme(evMejor, "Mejores umbrales encontrados");

  const cambios = Object.entries(mejores).filter(([k, v]) => v !== motor.UMBRALES_DEFECTO[k]);
  if (cambios.length === 0) {
    console.log("\nLos umbrales actuales ya son los mejores dentro del espacio de búsqueda.");
  } else {
    console.log("\nMejora: macro-F1 " + base.macroF1.toFixed(3) + " → " + evMejor.macroF1.toFixed(3) +
                " · acuerdo " + (base.acierto*100).toFixed(1) + "% → " + (evMejor.acierto*100).toFixed(1) + "%");
    console.log("Cambios respecto a los actuales: " + cambios.map(([k, v]) => `${k}: ${motor.UMBRALES_DEFECTO[k]} → ${v}`).join(", "));
    console.log("\nPara aplicarlos, sustituir UMBRALES_DEFECTO en motor.js por:");
    console.log(JSON.stringify(mejores, null, 2));
  }
})().catch(e => { console.error("Error:", e.message); process.exit(1); });
