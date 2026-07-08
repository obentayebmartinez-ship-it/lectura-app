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

const VERSION = "motor v3.4";

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
// gente=jente...). OJO: se mantiene la DISTINCIÓN castellana c-z ≠ s
// (cielo→"zielo" ≠ "sielo") a propósito; en la práctica no penaliza el seseo
// porque Whisper devuelve la ortografía normalizada, no la pronunciación.
// "los" y "las" siguen siendo distintas.
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
  // Precomputar las formas fonéticas: dentro del doble bucle se consultan
  // m×n veces y fonetica() es una cadena de regex (se notaba en textos largos).
  const fonOrig   = origWords.map(fonetica);
  const fonSpoken = spokenWords.map(fonetica);
  for (let i=1;i<=m;i++){dp[i][0]=i*GAP;tb[i][0]=1;}
  for (let j=1;j<=n;j++){dp[0][j]=j*GAP;tb[0][j]=2;}
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const sim = similitud(fonOrig[i-1], fonSpoken[j-1]);
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

// ─── Repeticiones LEGÍTIMAS del texto (no del alumno) ────────────────────────
// Algunos textos repiten una frase a caballo de un punto ("...la gravedad. La
// gravedad es la fuerza..."). Un lector correcto la dice dos veces, pero NO es
// una repetición del alumno. Devuelve el conjunto de claves fonéticas (n-gramas
// 1..3) que la REFERENCIA repite consecutivamente con la primera aparición
// terminada en signo de fin de frase, para no colapsarlas como repetición.
function repeticionesLegitimas(pal) {
  const set = new Set();
  const fon = pal.map(fonetica);
  const FIN_FRASE = /[.!?…;:]$/;
  for (let n = 1; n <= 3; n++) {
    for (let k = 2 * n; k <= pal.length; k++) {
      const a = fon.slice(k - n, k), b = fon.slice(k - 2 * n, k - n);
      if (a.some(x => x === "") || !a.every((x, i) => x === b[i])) continue;
      // La primera aparición (b) termina, en su último token, en puntuación de fin
      if (FIN_FRASE.test(pal[k - n - 1] || "")) set.add(a.join("|"));
    }
  }
  return set;
}

// ─── Números y romanos: expansión a su forma HABLADA ─────────────────────────
// El texto de referencia escribe "1492" o "XVIII" como UNA palabra, pero el niño
// lee "mil cuatrocientos noventa y dos" / "dieciocho". Sin expandir, el
// alineamiento cuenta falsos errores en cascada. Expandimos la referencia a
// palabras para alinear, y luego colapsamos de vuelta (ver colapsarADisplay)
// para que cada número siga siendo UNA marca en pantalla y en las métricas.
function numeroAPalabras(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "cero";
  const U = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
    "once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve",
    "veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis",
    "veintisiete","veintiocho","veintinueve"];
  const DEC = ["","","","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
  const CEN = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos",
    "setecientos","ochocientos","novecientos"];
  const men100 = x => x < 30 ? U[x] : (x % 10 ? DEC[Math.floor(x/10)] + " y " + U[x%10] : DEC[Math.floor(x/10)]);
  const men1000 = x => {
    if (x < 100) return men100(x);
    if (x === 100) return "cien";
    const c = Math.floor(x/100), r = x % 100;
    return r ? CEN[c] + " " + men100(r) : CEN[c];
  };
  if (n < 1000) return men1000(n);
  if (n < 1000000) {
    const miles = Math.floor(n/1000), r = n % 1000;
    const pref = miles === 1 ? "mil" : men1000(miles) + " mil";
    return r ? pref + " " + men1000(r) : pref;
  }
  const mill = Math.floor(n/1000000), r = n % 1000000;
  const pref = mill === 1 ? "un millón" : men1000(mill) + " millones";
  return r ? pref + " " + numeroAPalabras(r) : pref;
}

const ROMANO_RE = /^(M{0,4})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const ORDINAL_M = { 1:"primero",2:"segundo",3:"tercero",4:"cuarto",5:"quinto",6:"sexto",
  7:"séptimo",8:"octavo",9:"noveno",10:"décimo",11:"undécimo",12:"duodécimo",
  13:"decimotercero",14:"decimocuarto",15:"decimoquinto",16:"decimosexto",
  17:"decimoséptimo",18:"decimoctavo",19:"decimonoveno",20:"vigésimo" };
function esRomanoToken(s) {
  if (!s || s !== s.toUpperCase()) return false;           // solo MAYÚSCULAS (los numerales lo son)
  if (!/^[IVXLCDM]+$/.test(s) || !ROMANO_RE.test(s)) return false;
  if (s.length === 1 && !"IVX".includes(s)) return false;  // evita L,C,D,M sueltas (iniciales, no números)
  return true;
}
function romanoAEntero(s) {
  const V = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let tot = 0;
  for (let i = 0; i < s.length; i++) tot += (V[s[i]] < (V[s[i+1]] || 0)) ? -V[s[i]] : V[s[i]];
  return tot;
}

// Expande la referencia: devuelve tokens para alinear (refExp), y por cada uno
// el índice de la palabra que se muestra en pantalla (refMap) y —solo para
// romanos de un token— las formas fonéticas aceptables (refAlt: cardinal y
// ordinal, porque "siglo V" se lee "cinco" pero "Carlos V" se lee "quinto").
function expandirReferencia(palabrasDisplay) {
  const refExp = [], refMap = [], refAlt = [];
  palabrasDisplay.forEach((tok, di) => {
    const core = (tok.match(/[0-9A-Za-z]+/) || [""])[0];
    let words = null, alts = null;
    if (core && /^\d+$/.test(core) && core === tok.replace(/[^0-9]/g, "")) {
      words = numeroAPalabras(parseInt(core, 10)).split(" ");
    } else if (core && esRomanoToken(core) && core === tok.replace(/[^A-Za-z]/g, "")) {
      const v = romanoAEntero(core);
      words = numeroAPalabras(v).split(" ");
      if (words.length === 1) {
        const s = new Set([fonetica(words[0])]);
        const om = ORDINAL_M[v];
        if (om) { s.add(fonetica(om)); s.add(fonetica(om.replace(/o$/, "a"))); }
        alts = Array.from(s);
      }
    }
    if (!words) { refExp.push(tok); refMap.push(di); refAlt.push(null); return; }
    words.forEach(w => { refExp.push(w); refMap.push(di); refAlt.push(words.length === 1 ? alts : null); });
  });
  return { refExp, refMap, refAlt };
}

// Colapsa el alineamiento (a nivel de token expandido) a nivel de PALABRA de
// pantalla: las palabras normales pasan 1-a-1 (con su forma fonética _fon y sus
// alternativas _alt); los números/romanos de varios tokens se agrupan en un
// solo item con veredicto ya decidido (_forzado: correcta|sustitucion|omision).
function colapsarADisplay(alignment, refExp, refMap, refAlt, palabrasDisplay) {
  const cuenta = {};
  refMap.forEach(di => { cuenta[di] = (cuenta[di] || 0) + 1; });
  const out = [];
  let i = 0;
  while (i < alignment.length) {
    const it = alignment[i];
    if (it.origIdx < 0) {   // inserción (palabra dicha de más)
      out.push({ orig: null, origIdx: -1, spoken: it.spoken, spokenIdx: it.spokenIdx, _fon: null, _alt: null });
      i++; continue;
    }
    const di = refMap[it.origIdx];
    if (cuenta[di] === 1) {  // palabra normal o romano de un solo token → pasa 1-a-1
      out.push({ orig: palabrasDisplay[di], origIdx: di, spoken: it.spoken, spokenIdx: it.spokenIdx,
                 _fon: refExp[it.origIdx], _alt: refAlt[it.origIdx] });
      i++; continue;
    }
    // Palabra expandida en varios tokens: agrupar (absorbiendo inserciones
    // intercaladas, no las finales) y decidir un único veredicto.
    let j = i, lastRef = -1; const grupo = [];
    while (j < alignment.length) {
      const a = alignment[j];
      if (a.origIdx >= 0) { if (refMap[a.origIdx] !== di) break; lastRef = grupo.length; }
      grupo.push(a); j++;
    }
    const usados = grupo.slice(0, lastRef + 1);
    i += usados.length;
    const refItems = usados.filter(g => g.origIdx >= 0);
    const casan = refItems.filter(g => g.spoken !== null &&
      (fonetica(refExp[g.origIdx]) === fonetica(g.spoken) ||
       (refAlt[g.origIdx] && refAlt[g.origIdx].indexOf(fonetica(g.spoken)) >= 0))).length;
    const omit = refItems.filter(g => g.spoken === null).length;
    const dichos = usados.map(g => g.spoken).filter(Boolean);
    const rep = usados.find(g => g.spokenIdx >= 0);
    const forzado = omit === refItems.length ? "omision"
      : (casan === refItems.length && usados.length === refItems.length) ? "correcta"
      : "sustitucion";
    out.push({ orig: palabrasDisplay[di], origIdx: di, spoken: dichos.join(" ") || null,
               spokenIdx: rep ? rep.spokenIdx : -1, _fon: null, _alt: null, _forzado: forzado });
  }
  return out;
}

// ─── ANÁLISIS COMPLETO ───────────────────────────────────────────────────────
// Devuelve { version, metricas, detallePalabras, ui, diag }.
//   metricas        → lo que se guarda en la tabla sesiones
//   detallePalabras → filas de sesion_palabras (dataset + verificación)
//   ui.porPalabra   → {origIdx, clase, tip} para colorear el texto
//   ui.errores / ui.observaciones → listas del panel "Detalle de la lectura"
//   diag            → datos crudos para el JSON de diagnóstico
function analizar(entrada, umbralesExtra) {
  const U = Object.assign({}, UMBRALES_DEFECTO, umbralesExtra || {});
  const palabrasDisplay = entrada.palabras || [];
  // Expandir números arábigos y romanos de la referencia a su forma hablada,
  // para que el alineamiento no cuente falsos errores cuando el niño lee "1492"
  // como "mil cuatrocientos noventa y dos". refMap indica, por cada token
  // expandido, a qué palabra de pantalla pertenece (se colapsa tras alinear).
  const { refExp, refMap, refAlt } = expandirReferencia(palabrasDisplay);
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
  // Frases que el propio texto repite tras un punto: no se colapsan (ver helper).
  const repesLegitimos = repeticionesLegitimas(palabrasDisplay);
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
      // Repetición LEGÍTIMA del texto (no del alumno) y NO artefacto solapado:
      // dejarla intacta para que el alineamiento case las dos apariciones.
      if (!solape && repesLegitimos.has(a.map(w => fonetica(w.Word)).join("|"))) continue;
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

  // 2. Alineación global Needleman-Wunsch (sobre la referencia EXPANDIDA)…
  const alignExp = spokenTexts.length > 0
    ? alinearNW(refExp, spokenTexts, U.nwGap)
    : refExp.map((p,i) => ({orig:p, origIdx:i, spoken:null, spokenIdx:-1}));
  // …y colapso a nivel de palabra de pantalla: un número/romano vuelve a ser
  // UNA marca (coherente en métricas, detalle y hoja de registro).
  const alignment = colapsarADisplay(alignExp, refExp, refMap, refAlt, palabrasDisplay);

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
    // ── Número/romano colapsado: veredicto ya decidido en colapsarADisplay ──
    if (item._forzado) {
      if (item._forzado === "correcta") {
        correctas++;
        marca(item, "done", null);
        reg(item, "correcta");
      } else if (item._forzado === "omision") {
        if (ai > lastSpokenAi) {   // cola no leída: la sesión terminó antes
          marca(item, "", "No leída · la lectura terminó antes de este número");
          reg(item, "no_leida");
        } else {
          omisiones++;
          marca(item, "omision", "Omisión · no leyó este número");
          errDetalle.push({ word: limpiar(item.orig), tipo: "omision" });
          reg(item, "omision");
        }
      } else {   // sustitucion: lo leyó, pero mal
        sustituciones++;
        marca(item, "sustitucion", "Lectura errónea del número · dijo «" + limpiar(item.spoken || "") + "»");
        errDetalle.push({ word: limpiar(item.orig), tipo: "sustitucion", dicho: limpiar(item.spoken || "") });
        reg(item, "sustitucion");
      }
      return;
    }

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
      const sigRef = sig ? (sig._fon || sig.orig) : null;
      const sigN = sigRef ? normalizar(sigRef) : "";
      // Rectificación / falso comienzo: dijo algo parecido (o un trozo inicial,
      // "ma- mariposa") de la SIGUIENTE palabra y luego la leyó bien.
      const falsoComienzo = sigN && wn.length >= 2 && wn !== sigN && sigN.startsWith(wn);
      const parecida      = sigRef && wn !== sigN && similitud(fonetica(item.spoken), fonetica(sigRef)) >= U.simFalsoComienzo;
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
    // _fon = forma fonética de referencia (para romanos, el cardinal; para el
    // resto, la propia palabra). _alt = otras lecturas válidas (ordinal romano).
    const exacta  = (origN === spokenN) || (fonetica(item._fon) === fonetica(item.spoken))
                    || (item._alt && item._alt.indexOf(fonetica(item.spoken)) >= 0);

    if (exacta) {
      // LECTURA ERRÓNEA recuperada: el reconocedor "autocorrige" lo mal leído
      // hacia la palabra del texto, pero lo delata con ErrorType
      // "Mispronunciation" y AccuracyScore muy bajo (las palabras bien leídas
      // puntúan 70-100; las falladas, 1-49). Cuenta como sustitución.
      const accW = w?.PronunciationAssessment?.AccuracyScore ?? 100;
      const etW  = w?.PronunciationAssessment?.ErrorType;
      if (etW === "Mispronunciation" && accW < U.accSustitucion &&
          !PALABRAS_FUNCIONALES.has(origN) && fonetica(item._fon).length >= U.lenFonSustitucion) {
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
      const trasPuntuacion = item.origIdx > 0 && /[.,;:!?…»)]$/.test(palabrasDisplay[item.origIdx - 1]);
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
    } else if (esInversion(item._fon, item.spoken)) {
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
         similitud, alinearNW, esInversion, limpiar, MULETILLAS, PALABRAS_FUNCIONALES,
         numeroAPalabras, expandirReferencia, esRomanoToken, romanoAEntero };
});
