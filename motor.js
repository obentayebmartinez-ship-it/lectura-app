// ============================================================================
// LectorIA · motor.js — motor de análisis de lectura (v3.3)
//
// Módulo PURO y compartido: lo carga index.html en el navegador (crea el
// global MotorLectura) y calibrar.js en Node (require). No toca el DOM,
// ni Supabase, ni Azure: recibe datos y devuelve el análisis.
//
// analizar(entrada, umbrales?) espera:
//   {
//     palabras,       // array de palabras del texto de referencia (con puntuación)
//     allWords,       // palabras crudas de Azure acumuladas (detailResult.Words,
//                     // ya sin las entradas de ErrorType "Omission")
//     segundos,       // duración de reloj de pared de la sesión
//     fluencyTotal, fluencyCount, prosodyTotal, prosodyCount
//   }
//
// Todos los umbrales del clasificador viven en UMBRALES_DEFECTO. calibrar.js
// los ajusta contra las sesiones verificadas por el docente y el resultado
// se pega aquí: NO cambiar valores a ojo, cambiarlos con datos.
// ============================================================================
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.MotorLectura = factory();
})(typeof self !== "undefined" ? self : this, function () {
"use strict";

const VERSION = "motor v3.3";

// ─── Umbrales del clasificador (calibrables con calibrar.js) ─────────────────
const UMBRALES_DEFECTO = {
  nwGap:             -0.55,     // penalización de hueco en el alineamiento NW
  simFalsoComienzo:   0.55,     // similitud mínima inserción↔siguiente para rectificación
  accSustitucion:     50,       // Mispronunciation con accuracy < esto → sustitución
  lenFonSustitucion:  4,        // longitud fonética mínima para aplicar esa regla
  rectAccMal:         45,       // 1er intento con accuracy < esto → candidato a rectificación
  rectAccBien:        70,       // 2º intento con accuracy ≥ esto → rectificación
  pausaMinTicks:      8000000,  // suelo del umbral de pausa (0.8 s, ticks de 100 ns)
  pausaMult:          3,        // × gap mediano del propio alumno
  pausaPuntMinTicks:  20000000, // suelo del umbral tras puntuación (2 s)
  pausaPuntMult:      2.5,      // × umbral de pausa normal
  solapeTicks:        500000    // solape mínimo para considerar un duplicado artefacto (50 ms)
};

// ─── Muletillas habladas que NO deben contarse como adición ──────────────────
const MULETILLAS = new Set(["eh","ehh","em","emm","mm","mmm","um","uhm","ah","aah"]);

// ─── Palabras funcionales que el ASR pierde a menudo AUNQUE se digan ─────────
// Contar su "omisión" como error genera falsos positivos sistemáticos.
// Se señalan con tooltip pero no puntúan.
const PALABRAS_FUNCIONALES = new Set(["el","la","los","las","un","una","unos","unas",
  "y","e","o","u","a","en","de","del","al","que","se","su","sus","con","por",
  "mi","me","te","le","lo","es","ni"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizar(str) {
  return (str || "").toLowerCase()
    .replace(/[.,;:!?¡¿\-«»()"']/g, "")
    .replace(/ñ/g, "N")                              // proteger ñ: NFD la rompería (uña ≠ una)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/N/g, "ñ")
    .trim();
}

// Normalización FONÉTICA del español: convierte una palabra a su forma
// "sonora" para no penalizar homófonos (tuvo=tubo, echo=hecho, halla=haya,
// cielo=sielo, gente=jente...). "los" y "las" siguen siendo distintas.
function fonetica(str) {
  let s = (str || "").toLowerCase()
    .replace(/[.,;:!?¡¿\-«»()"']/g, "")
    .replace(/ñ/g, "N")                              // proteger ñ antes de NFD
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/N/g, "ñ")
    .trim();
  if (!s) return "";
  s = s
    .replace(/ch/g, "C")            // proteger dígrafo 'ch'
    .replace(/rr/g, "R")            // proteger 'rr' (perro ≠ pero, son sonidos distintos)
    .replace(/v/g, "b")              // v = b (homófono en todo el español)
    .replace(/ll/g, "y")            // ll = y (yeísmo)
    .replace(/qu(?=[ei])/g, "k")    // que/qui → ke/ki
    .replace(/gu(?=[ei])/g, "G")    // gue/gui → Ge/Gi (u muda, G = g fuerte protegida)
    .replace(/c(?=[ei])/g, "z")     // ce/ci → ze/zi (sonido /θ/ castellano, distinto de s)
    .replace(/c/g, "k")              // resto de c → k (ca/co/cu/cl/cr)
    .replace(/g(?=[ei])/g, "j")     // ge/gi → je/ji (g suave)
    .replace(/G/g, "g")             // restaurar g fuerte (guerra → gera)
    .replace(/C/g, "ch")            // restaurar 'ch'
    .replace(/R/g, "rr")            // restaurar 'rr'
    .replace(/x/g, "ks")            // x → ks
    .replace(/h/g, "")              // h muda
    .replace(/w/g, "u")
    .trim();
  return s;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) =>
    Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++)
    for (let j=1;j<=n;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function similitud(a, b) {
  if (a===b) return 1;
  if (!a||!b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen===0) return 1;
  const dist = levenshtein(a, b);
  if (maxLen<=3) return dist===0?1:dist===1?0.7:0.2;
  if (maxLen<=5) return dist===0?1:dist===1?0.8:dist===2?0.5:0.2;
  return Math.max(0, 1 - dist/maxLen);
}

// ─── Needleman-Wunsch sobre el Lexical de Azure ──────────────────────────────
// Azure continuo NO incluye omisiones en Words[]. Solución: alineamos el texto
// transcrito (Lexical) contra el texto de referencia con NW, y usamos los
// AccuracyScore de Azure por palabra para detectar mispronunciaciones.
function alinearNW(origWords, spokenWords, gapPen) {
  const m = origWords.length, n = spokenWords.length;
  const GAP = (gapPen != null) ? gapPen : UMBRALES_DEFECTO.nwGap;
  const dp = Array.from({length:m+1}, () => new Float32Array(n+1));
  const tb = Array.from({length:m+1}, () => new Int8Array(n+1));
  for (let i=1;i<=m;i++){dp[i][0]=i*GAP;tb[i][0]=1;}
  for (let j=1;j<=n;j++){dp[0][j]=j*GAP;tb[0][j]=2;}
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const sim = similitud(fonetica(origWords[i-1]), fonetica(spokenWords[j-1]));
      const ms  = sim*2-1;
      const d=dp[i-1][j-1]+ms, u=dp[i-1][j]+GAP, l=dp[i][j-1]+GAP;
      if (d>=u&&d>=l){dp[i][j]=d;tb[i][j]=0;}
      else if (u>=l){dp[i][j]=u;tb[i][j]=1;}
      else{dp[i][j]=l;tb[i][j]=2;}
    }
  }
  const al=[];let i=m,j=n;
  while(i>0||j>0){
    if(i>0&&j>0&&tb[i][j]===0){al.unshift({orig:origWords[i-1],origIdx:i-1,spoken:spokenWords[j-1],spokenIdx:j-1});i--;j--;}
    else if(i>0&&(j===0||tb[i][j]===1)){al.unshift({orig:origWords[i-1],origIdx:i-1,spoken:null,spokenIdx:-1});i--;}
    else{al.unshift({orig:null,origIdx:-1,spoken:spokenWords[j-1],spokenIdx:j-1});j--;}
  }
  return al;
}

// ─── Detección de inversión (anagrama: mismas letras, distinto orden) ─────────
function esInversion(target, spoken) {
  const t = fonetica(target), s = fonetica(spoken);
  if (t === s || t.length !== s.length || t.length < 2) return false;
  const ord = x => x.split("").sort().join("");
  return ord(t) === ord(s);   // mismas letras (sonidos), distinto orden
}

// Limpia signos de puntuación de una palabra
function limpiar(p) { return (p||"").replace(/[.,;:!?¡¿]/g, ""); }

// ─── ANÁLISIS COMPLETO ───────────────────────────────────────────────────────
// Devuelve { version, metricas, detallePalabras, ui, diag }.
//   metricas        → lo que se guarda en la tabla sesiones
//   detallePalabras → filas de sesion_palabras (dataset + verificación)
//   ui.porPalabra   → {origIdx, clase, tip} para colorear el texto
//   ui.errores / ui.observaciones → listas del panel "Detalle de la lectura"
//   diag            → datos crudos para el JSON de diagnóstico
function analizar(entrada, umbralesExtra) {
  const U = Object.assign({}, UMBRALES_DEFECTO, umbralesExtra || {});
  const palabras = entrada.palabras || [];
  const segundos = entrada.segundos || 0;
  // Copia profunda: el colapso de repeticiones modifica los objetos y el
  // análisis debe poder repetirse (calibración) sin corromper la entrada.
  const allWords = JSON.parse(JSON.stringify(entrada.allWords || []));

  // 1. Ordenar palabras dichas por tiempo
  const spokenRaw = allWords.filter(w => w && w.Word).sort((a,b) => (a.Offset||0)-(b.Offset||0));

  // 1b. Colapsar REPETICIONES por n-gramas (1 a 3 palabras) CON conciencia
  // temporal. Azure a veces emite duplicada la última palabra de un segmento
  // al inicio del siguiente (artefacto de límite de segmento). Un duplicado
  // artefacto se SOLAPA en el tiempo con el original; una repetición real del
  // alumno nunca puede solaparse consigo misma. Los artefactos se descartan
  // en silencio; solo las repeticiones reales marcan _repetida.
  const FIN = w => (w.Offset||0) + (w.Duration||0);
  const spoken = [];
  for (const cur of spokenRaw) {
    spoken.push(cur);
    for (let n = 1; n <= 3; n++) {
      if (spoken.length < 2 * n) continue;
      const a = spoken.slice(-n), b = spoken.slice(-2 * n, -n);
      const igual = a.every((w, k) => {
        const f = fonetica(w.Word);
        return f !== "" && f === fonetica(b[k].Word);
      });
      if (!igual) continue;
      // ¿La "copia" empieza antes de que termine el original? → artefacto
      const solape = (a[0].Offset||0) < FIN(b[b.length - 1]) - U.solapeTicks;
      const lastB = b[b.length - 1], lastA = a[a.length - 1];
      if (!solape) {
        if (n === 1) {
          const kept = b[0], cop = a[0];
          const accK = kept.PronunciationAssessment?.AccuracyScore ?? 100;
          const accC = cop.PronunciationAssessment?.AccuracyScore ?? 100;
          const etK  = kept.PronunciationAssessment?.ErrorType;
          // RECTIFICACIÓN: primer intento erróneo, segundo limpio
          // (p.ej. "importante" mal leída acc=34 e inmediatamente bien acc=100)
          if ((accK < U.rectAccMal || etK === "Mispronunciation") && accC >= U.rectAccBien) {
            kept._rectificada = true;
          } else {
            kept._repetida = (kept._repetida || 1) + 1;
          }
          // La palabra queda representada por su MEJOR intento
          if (accC > accK && kept.PronunciationAssessment && cop.PronunciationAssessment) {
            kept.PronunciationAssessment.AccuracyScore = accC;
            kept.PronunciationAssessment.ErrorType    = cop.PronunciationAssessment.ErrorType;
          }
        } else {
          b.forEach(w => { w._repetida = (w._repetida || 1) + 1; });
        }
      }
      // Extender la duración del último conservado hasta el final de la copia:
      // si no, el hueco del duplicado eliminado aparece como PAUSA FANTASMA
      // y dispara vacilaciones falsas en la palabra siguiente.
      lastB.Duration = Math.max(lastB.Duration || 0, (lastA.Offset||0) + (lastA.Duration||0) - (lastB.Offset||0));
      spoken.length -= n;   // en ambos casos se descarta la copia
      break;
    }
  }
  const spokenTexts = spoken.map(w => w.Word);

  // 2. Alineación global Needleman-Wunsch
  const alignment = spokenTexts.length > 0
    ? alinearNW(palabras, spokenTexts, U.nwGap)
    : palabras.map((p,i) => ({orig:p, origIdx:i, spoken:null, spokenIdx:-1}));

  // 2b. Si la lectura se interrumpió antes del final (botón pulsado antes de
  // terminar), la cola de palabras no leídas NO debe contar como omisiones.
  let lastSpokenAi = -1;
  alignment.forEach((it, k) => { if (it.spoken !== null) lastSpokenAi = k; });

  // 3. Silencio ANTES de cada palabra dicha + umbral ADAPTATIVO de pausa.
  // Un lector lento deja huecos mayores entre TODAS las palabras: la pausa
  // que señala vacilación es la que destaca sobre SU propio ritmo, no un
  // valor fijo.
  const gapAntes = new Map();
  const gaps = [];
  for (let i = 1; i < spoken.length; i++) {
    const gap = (spoken[i].Offset||0) - ((spoken[i-1].Offset||0) + (spoken[i-1].Duration||0));
    gapAntes.set(i, gap);
    if (gap > 0) gaps.push(gap);
  }
  gaps.sort((x, y) => x - y);
  const gapMediano       = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const umbralPausa      = Math.max(U.pausaMinTicks,     gapMediano * U.pausaMult);
  const umbralPausaPunt  = Math.max(U.pausaPuntMinTicks, umbralPausa * U.pausaPuntMult);
  let pausasLargas = 0;   // se cuentan durante la clasificación (con contexto)

  // 4. Clasificar
  let omisiones=0, sustituciones=0, adiciones=0, inversiones=0;
  let repeticiones=0, rectificaciones=0, vacilaciones=0, correctas=0;
  const errDetalle = [];   // errores: omisión, sustitución, inversión
  const obsDetalle = [];   // observaciones de fluidez: vacilación, repetición
  const porPalabra = [];   // marcas para colorear el texto en pantalla

  // Registro palabra a palabra en orden de lectura: es lo que revisa el
  // docente en verificar.html y el dataset del futuro modelo propio.
  const TICKS_MS = 10000;   // Azure mide en ticks de 100 ns
  const detallePalabras = [];
  const reg = (item, tipo, gap) => {
    const w = item.spokenIdx >= 0 ? spoken[item.spokenIdx] : null;
    detallePalabras.push({
      idx:           item.origIdx,
      palabra_ref:   item.orig || null,
      palabra_dicha: item.spoken || null,
      tipo_ia:       tipo,
      accuracy:      w?.PronunciationAssessment?.AccuracyScore ?? null,
      offset_ms:     w ? Math.round((w.Offset   || 0) / TICKS_MS) : null,
      duracion_ms:   w ? Math.round((w.Duration || 0) / TICKS_MS) : null,
      gap_ms:        (gap != null) ? Math.round(gap / TICKS_MS) : null
    });
  };
  const marca = (item, clase, tip) => {
    if (item.origIdx >= 0) porPalabra.push({ origIdx: item.origIdx, clase, tip: tip || null });
  };

  alignment.forEach((item, ai) => {
    // ── Palabra dicha de más (inserción, NO repetición consecutiva) ──
    if (item.orig === null) {
      const wn  = normalizar(item.spoken);
      // Muletilla ("eh", "mmm"...): es vacilación, no palabra añadida.
      if (MULETILLAS.has(wn)) {
        vacilaciones++;
        obsDetalle.push({word: limpiar(item.spoken), tipo: "vacilacion", motivo: "muletilla"});
        reg(item, "vacilacion");
        return;
      }
      const sig  = alignment[ai+1];
      const sigN = sig && sig.orig ? normalizar(sig.orig) : "";
      // Rectificación / falso comienzo: dijo algo parecido (o un trozo inicial,
      // "ma- mariposa") de la SIGUIENTE palabra y luego la leyó bien.
      const falsoComienzo = sigN && wn.length >= 2 && wn !== sigN && sigN.startsWith(wn);
      const parecida      = sigN && wn !== sigN && similitud(fonetica(item.spoken), fonetica(sig.orig)) >= U.simFalsoComienzo;
      if (falsoComienzo || parecida) {
        rectificaciones++;
        reg(item, "rectificacion");
      } else {
        adiciones++;
        reg(item, "adicion");
      }
      return;
    }

    // ── Omisión ──
    if (item.spoken === null) {
      // Cola no leída: la sesión terminó antes de llegar aquí.
      if (ai > lastSpokenAi) {
        marca(item, "", "No leída · la lectura terminó antes de esta palabra");
        reg(item, "no_leida");
        return;
      }
      // Palabra funcional corta: el reconocedor se las traga con frecuencia
      // aunque el alumno las diga → señalar sin contabilizar.
      if (PALABRAS_FUNCIONALES.has(normalizar(item.orig))) {
        marca(item, "", "Posible omisión · palabra corta que el reconocedor pierde a menudo (no contabilizada)");
        reg(item, "omision_dudosa");
        return;
      }
      marca(item, "omision", "Omisión · no leyó esta palabra");
      omisiones++;
      errDetalle.push({word: limpiar(item.orig), tipo: "omision"});
      reg(item, "omision");
      return;
    }

    // ── Coincide foneticamente o sustituye ──
    const w       = spoken[item.spokenIdx];
    const origN   = normalizar(item.orig);
    const spokenN = normalizar(item.spoken);
    const exacta  = (origN === spokenN) || (fonetica(item.orig) === fonetica(item.spoken));

    if (exacta) {
      // LECTURA ERRÓNEA recuperada: el reconocedor "autocorrige" lo mal leído
      // hacia la palabra del texto, pero lo delata con ErrorType
      // "Mispronunciation" y AccuracyScore muy bajo (las palabras bien leídas
      // puntúan 70-100; las falladas, 1-49). Cuenta como sustitución.
      const accW = w?.PronunciationAssessment?.AccuracyScore ?? 100;
      const etW  = w?.PronunciationAssessment?.ErrorType;
      if (etW === "Mispronunciation" && accW < U.accSustitucion &&
          !PALABRAS_FUNCIONALES.has(origN) && fonetica(item.orig).length >= U.lenFonSustitucion) {
        sustituciones++;
        marca(item, "sustitucion", "Lectura errónea · la pronunció mal (precisión " + accW + "/100)");
        errDetalle.push({word: limpiar(item.orig), tipo: "sustitucion", dicho: "mal pronunciada"});
        reg(item, "sustitucion");
        return;
      }
      // Palabra leída correctamente (cuenta para precisión aunque se repita)
      correctas++;
      const esRectificada = w && w._rectificada;
      const esRepetida    = w && w._repetida;
      // Pausa: solo cuenta como vacilación si NO viene tras un signo de
      // puntuación (pausar en el punto/coma es prosodia CORRECTA, no duda),
      // y el umbral se adapta al ritmo del propio alumno.
      const gap            = gapAntes.get(item.spokenIdx) || 0;
      const trasPuntuacion = item.origIdx > 0 && /[.,;:!?…»)]$/.test(palabras[item.origIdx - 1]);
      const hayPausaAntes  = gap > (trasPuntuacion ? umbralPausaPunt : umbralPausa);
      if (hayPausaAntes) pausasLargas++;

      if (esRectificada) {
        rectificaciones++;
        marca(item, "rectificacion", "Rectificación · la leyó mal y se corrigió al instante");
        obsDetalle.push({word: limpiar(item.orig), tipo: "rectificacion"});
        reg(item, "rectificacion", gap);
      } else if (esRepetida) {
        repeticiones++;
        marca(item, "repeticion", "Repetición · la dijo " + w._repetida + " veces");
        obsDetalle.push({word: limpiar(item.orig), tipo: "repeticion"});
        reg(item, "repeticion", gap);
      } else if (hayPausaAntes) {
        vacilaciones++;
        marca(item, "vacilacion", "Vacilación · pausa de " + (gap/10000000).toFixed(1) + "s antes de leerla");
        obsDetalle.push({word: limpiar(item.orig), tipo: "vacilacion", motivo: "pausa"});
        reg(item, "vacilacion", gap);
      } else {
        marca(item, "done", null);
        reg(item, "correcta", gap);
      }
    } else if (esInversion(item.orig, item.spoken)) {
      inversiones++;
      marca(item, "inversion", "Inversión · dijo «" + limpiar(item.spoken) + "» (letras cambiadas)");
      errDetalle.push({word: limpiar(item.orig), tipo: "inversion", dicho: limpiar(item.spoken)});
      reg(item, "inversion");
    } else {
      sustituciones++;
      marca(item, "sustitucion", "Sustitución · dijo «" + limpiar(item.spoken) + "» en vez de «" + limpiar(item.orig) + "»");
      errDetalle.push({word: limpiar(item.orig), tipo: "sustitucion", dicho: limpiar(item.spoken)});
      reg(item, "sustitucion");
    }
  });

  // 5. Métricas globales
  const leidas    = correctas + sustituciones + inversiones;
  const totalRef  = correctas + sustituciones + inversiones + omisiones;
  // PPM sobre el tiempo de habla real (primer offset → fin de la última
  // palabra), no sobre el reloj de pared: no penaliza tardar en empezar
  // ni el retardo al pulsar "terminar".
  let segLectura = segundos;
  if (spoken.length > 0) {
    const fin = spoken[spoken.length - 1];
    const habla = ((fin.Offset||0) + (fin.Duration||0) - (spoken[0].Offset||0)) / 10000000;
    if (habla > 1) segLectura = habla;
  }
  const ppm       = segLectura > 0 ? Math.round(leidas / segLectura * 60) : 0;
  const precision = totalRef > 0 ? Math.round(correctas / totalRef * 100) : 0;
  const fCount    = entrada.fluencyCount || 0, pCount = entrada.prosodyCount || 0;
  const fluency   = fCount > 0 ? Math.round((entrada.fluencyTotal || 0) / fCount) : precision;
  const prosody   = pCount > 0 ? Math.round((entrada.prosodyTotal || 0) / pCount) : 0;

  return {
    version: VERSION,
    metricas: { ppm, precision, fluency, prosody, omisiones, sustituciones, adiciones,
                inversiones, repeticiones, rectificaciones, vacilaciones, pausasLargas,
                correctas, leidas, totalRef, segLectura: Math.round(segLectura) },
    detallePalabras,
    ui: { porPalabra, errores: errDetalle, observaciones: obsDetalle },
    diag: {
      spokenRaw: spokenRaw.map(w => ({ w: w.Word, off: w.Offset, dur: w.Duration,
        acc: w.PronunciationAssessment?.AccuracyScore,
        et:  w.PronunciationAssessment?.ErrorType })),
      alineamiento: alignment.map(x => ({ ref: x.orig, dicho: x.spoken }))
    }
  };
}

return { VERSION, UMBRALES_DEFECTO, analizar, normalizar, fonetica, levenshtein,
         similitud, alinearNW, esInversion, limpiar, MULETILLAS, PALABRAS_FUNCIONALES };
});
