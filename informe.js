// ─── LectorIA · informe.js ────────────────────────────────────────────────────
// Informe PDF de progreso lector de un alumno. Compartido por panel.html y
// alumno.html (antes cada página tenía su propio generarPDF duplicado).
//
//   InformeLectorIA.generar({ nombre, curso, sesiones })
//
// `sesiones` = filas de la tabla `sesiones` del alumno, ordenadas por fecha
// ascendente. El informe usa: ppm, precision, fluency, prosody, los contadores
// de error, duracion_segundos, estado y niveles (hoja de registro verificada).
(function (global) {
  "use strict";

  // Paleta de tipos de error (misma que la leyenda de verificar.html)
  const TIPOS_ERROR = [
    { key: "omisiones",       label: "Omisiones",       corto: "Om", hex: "#F09595", rgb: [240, 149, 149] },
    { key: "sustituciones",   label: "Sustituciones",   corto: "Su", hex: "#EF9F27", rgb: [239, 159, 39]  },
    { key: "inversiones",     label: "Inversiones",     corto: "In", hex: "#7FB5E6", rgb: [127, 181, 230] },
    { key: "adiciones",       label: "Adiciones",       corto: "Ad", hex: "#E29CC0", rgb: [226, 156, 192] },
    { key: "repeticiones",    label: "Repeticiones",    corto: "Re", hex: "#AFA9EC", rgb: [175, 169, 236] },
    { key: "rectificaciones", label: "Rectificaciones", corto: "Rc", hex: "#E8C083", rgb: [232, 192, 131] },
    { key: "vacilaciones",    label: "Vacilaciones",    corto: "Va", hex: "#E0A845", rgb: [224, 168, 69]  }
  ];

  // Hoja de registro: mismas dimensiones que verificar.html.
  // positivo:true → nivel alto es BUENO; en el resto el nivel mide la
  // intensidad de la dificultad observada.
  const DIMENSIONES = [
    { grupo: "Fluidez lectora", items: [
      { key: "silabeo",           label: "Silabeo" },
      { key: "pausas_entonacion", label: "Pausas y entonación", positivo: true },
      { key: "vacilacion",        label: "Vacilación" },
      { key: "rectificacion",     label: "Rectificación" },
      { key: "repeticion",        label: "Repetición" },
      { key: "velocidad",         label: "Velocidad", positivo: true }
    ]},
    { grupo: "Exactitud lectora", items: [
      { key: "sustitucion", label: "Sustitución" },
      { key: "omisiones",   label: "Omisiones" },
      { key: "inversion",   label: "Inversión" },
      { key: "adicion",     label: "Adición" },
      { key: "rotacion",    label: "Rotación (b/d, p/q)" }
    ]},
    { grupo: "Comprensión y expresión", items: [
      { key: "comprension", label: "Comprensión lectora", positivo: true }
    ]}
  ];

  // Propuesta de trabajo por dimensión de la hoja de registro. Claves = las de
  // `niveles` (ver DIMENSIONES). Se usan para generar recomendaciones concretas.
  const CONSEJOS_TRABAJO = {
    silabeo:           "Silabeo: leer palabras completas de un golpe de vista (barrido visual), empezando por palabras cortas y frecuentes.",
    pausas_entonacion: "Pausas y entonación: lectura en eco (el adulto lee una frase con expresión y el alumno la repite) y respeto de los signos de puntuación.",
    vacilacion:        "Vacilación: listas de palabras de uso frecuente para automatizar el reconocimiento y ganar seguridad.",
    rectificacion:     "Rectificación: una primera lectura silenciosa del texto antes de leerlo en voz alta.",
    repeticion:        "Repetición: lecturas repetidas del mismo texto hasta leerlo con soltura.",
    velocidad:         "Velocidad: práctica diaria breve (10 min) con textos de su nivel y lecturas cronometradas para ver el progreso.",
    sustitucion:       "Sustitución: lectura pausada de palabras aisladas y pseudopalabras, priorizando la exactitud antes que la velocidad.",
    omisiones:         "Omisiones: seguir la línea con el dedo o una regla para no saltarse palabras.",
    inversion:         "Inversión: conciencia fonológica — ordenar sílabas y sonidos dentro de la palabra.",
    adicion:           "Adición: leer despacio marcando cada palabra para no añadir palabras que no están en el texto.",
    rotacion:          "Rotación (b/d, p/q): discriminación visual de letras espejo con apoyos multisensoriales.",
    comprension:       "Comprensión: acompañar cada lectura con 3-5 preguntas orales sobre lo leído."
  };
  // Dimensiones donde un nivel ALTO es bueno (en el resto, alto = más dificultad)
  const POSITIVAS = new Set(["velocidad", "pausas_entonacion", "comprension"]);
  const ETIQUETA_DIM = {
    silabeo: "Silabeo", pausas_entonacion: "Pausas y entonación", vacilacion: "Vacilación",
    rectificacion: "Rectificación", repeticion: "Repetición", velocidad: "Velocidad",
    sustitucion: "Sustitución", omisiones: "Omisiones", inversion: "Inversión",
    adicion: "Adición", rotacion: "Rotación (b/d, p/q)", comprension: "Comprensión lectora"
  };
  // Mapa de los contadores de error (TIPOS_ERROR) a la clave de dimensión
  const ERR_A_DIM = {
    omisiones: "omisiones", sustituciones: "sustitucion", inversiones: "inversion",
    adiciones: "adicion", repeticiones: "repeticion", rectificaciones: "rectificacion",
    vacilaciones: "vacilacion"
  };
  // Gravedad de un nivel: 2 = prioritario, 1 = a vigilar, 0 = sin trabajo específico
  function severidadNivel(key, nivel) {
    if (!nivel) return 0;
    return POSITIVAS.has(key) ? (nivel === 1 ? 2 : nivel === 2 ? 1 : 0)
                              : (nivel === 3 ? 2 : nivel === 2 ? 1 : 0);
  }

  const VERDE = [29, 158, 117], AMBAR = [239, 159, 39], ROJO = [226, 75, 74];
  const TINTA = [17, 17, 17], GRIS = [107, 114, 128], GRIS_CLARO = [156, 163, 175];
  const NIVEL_ACTIVO = [223, 232, 240];   // gris-azulado neutro para el nivel marcado

  const media = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const fmtFecha = f => new Date(f).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });

  function estadoDe(ppm, objetivo) {
    if (ppm >= objetivo)       return { texto: "En nivel",       color: VERDE };
    if (ppm >= objetivo * 0.8) return { texto: "Cerca del nivel", color: AMBAR };
    return { texto: "Necesita apoyo", color: ROJO };
  }

  // Tendencia global: media de las 3 últimas lecturas vs las 3 primeras
  function tendenciaDe(ppms) {
    if (ppms.length < 2) return null;
    const n = Math.min(3, Math.floor(ppms.length / 2)) || 1;
    return Math.round(media(ppms.slice(-n)) - media(ppms.slice(0, n)));
  }

  // ─── Gráfica de evolución dibujada con primitivas de jsPDF ─────────────────
  function dibujarEvolucion(doc, x, y, w, h, ses, objetivo) {
    const ppms = ses.map(s => s.ppm);
    const lo = Math.min.apply(null, ppms.concat(objetivo));
    const hi = Math.max.apply(null, ppms.concat(objetivo));
    const min = Math.max(0, Math.floor((lo - 10) / 10) * 10);
    const max = Math.ceil((hi + 10) / 10) * 10;
    const px = i => ses.length === 1 ? x + w / 2 : x + (i / (ses.length - 1)) * w;
    const py = v => y + h - ((v - min) / (max - min)) * h;

    // Rejilla horizontal con etiquetas de PPM
    doc.setLineWidth(0.2);
    for (let k = 0; k <= 4; k++) {
      const v = min + (k * (max - min)) / 4;
      doc.setDrawColor(238, 238, 238);
      doc.line(x, py(v), x + w, py(v));
      doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRIS_CLARO);
      doc.text(String(Math.round(v)), x - 2, py(v) + 1, { align: "right" });
    }

    // Línea de objetivo (discontinua)
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(x, py(objetivo), x + w, py(objetivo));
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRIS);
    doc.text("objetivo " + objetivo, x + w, py(objetivo) - 1.5, { align: "right" });

    // Línea de evolución
    doc.setDrawColor.apply(doc, VERDE); doc.setLineWidth(0.7);
    for (let i = 1; i < ses.length; i++) doc.line(px(i - 1), py(ppms[i - 1]), px(i), py(ppms[i]));

    // Puntos coloreados por estado
    ses.forEach((s, i) => {
      const c = estadoDe(s.ppm, objetivo).color;
      doc.setFillColor.apply(doc, c);
      doc.circle(px(i), py(s.ppm), 1.15, "F");
    });

    // Fechas en el eje X (máximo ~8 etiquetas para que no se pisen)
    const paso = Math.max(1, Math.ceil(ses.length / 8));
    doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRIS_CLARO);
    ses.forEach((s, i) => {
      if (i % paso !== 0 && i !== ses.length - 1) return;
      doc.text(fmtFecha(s.fecha), px(i), y + h + 4, { align: "center" });
    });
  }

  // ─── Hoja de registro (niveles verificados) en dos columnas ─────────────────
  function dibujarNiveles(doc, y, niveles) {
    const colX = [14, 108];
    const colW = 88;
    const grupos = [
      DIMENSIONES[0],                                            // Fluidez (col. izda)
      { grupo: null, items: DIMENSIONES[1].items.concat(DIMENSIONES[2].items) } // Exactitud + Comprensión (col. dcha)
    ];
    const titulos = ["Fluidez lectora", "Exactitud y comprensión"];
    let maxY = y;

    grupos.forEach((g, col) => {
      let yy = y;
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, GRIS);
      doc.text(titulos[col].toUpperCase(), colX[col], yy);
      yy += 5;
      g.items.forEach(d => {
        const val = niveles[d.key];
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(55, 65, 81);
        doc.text(d.label, colX[col], yy + 3.6);
        // Tres casillas 1·2·3. La marcada usa SIEMPRE el mismo color neutro
        // (nunca semáforo): el nivel se interpreta con las recomendaciones, no
        // con el color, para no alarmar a las familias.
        for (let n = 1; n <= 3; n++) {
          const bx = colX[col] + colW - (4 - n) * 9;
          const activa = val === n;
          const c = activa ? NIVEL_ACTIVO : [243, 244, 246];
          doc.setFillColor.apply(doc, c);
          doc.roundedRect(bx, yy, 7.5, 5.5, 1.2, 1.2, "F");
          doc.setFontSize(8);
          if (activa) { doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, TINTA); }
          else { doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, GRIS_CLARO); }
          doc.text(String(n), bx + 3.75, yy + 4, { align: "center" });
        }
        yy += 7.5;
      });
      if (yy > maxY) maxY = yy;
    });
    return maxY;
  }

  // ─── Propuesta de trabajo: qué reforzar según lo que más le cuesta ──────────
  // Prioriza la hoja de registro verificada; si no la hay, deduce el trabajo de
  // los tipos de error de las últimas lecturas. Devuelve [{sev, key, texto}]
  // (sev 2 = prioritario), como máximo 5, ordenadas por gravedad.
  function propuestaTrabajo(ses, ultimaVerif) {
    const trabajo = [];
    if (ultimaVerif && ultimaVerif.niveles) {
      Object.keys(ETIQUETA_DIM).forEach(k => {
        const sev = severidadNivel(k, ultimaVerif.niveles[k]);
        if (sev > 0 && CONSEJOS_TRABAJO[k]) trabajo.push({ sev, key: k, texto: CONSEJOS_TRABAJO[k] });
      });
    } else {
      const recientes = (ses || []).slice(-5);
      TIPOS_ERROR.forEach(t => {
        const tot = recientes.reduce((s, r) => s + (r[t.key] || 0), 0);
        const dim = ERR_A_DIM[t.key];
        if (tot >= 3 && dim) trabajo.push({ sev: tot >= 6 ? 2 : 1, key: dim, texto: CONSEJOS_TRABAJO[dim] });
      });
    }
    return trabajo.sort((a, b) => b.sev - a.sev).slice(0, 5);
  }

  // ─── Caja de texto con título y viñetas, con salto de página propio ─────────
  function cajaTexto(doc, y, titulo, bullets, fill, headColor) {
    doc.setFontSize(9);
    const lineas = [];
    bullets.forEach(b => doc.splitTextToSize("•  " + b, 168).forEach(l => lineas.push(l)));
    const alto = lineas.length * 4.6 + 14;
    if (y + alto + 4 > 288) { doc.addPage(); y = 18; }
    doc.setFillColor.apply(doc, fill);
    doc.roundedRect(14, y, 182, alto, 3, 3, "F");
    doc.setTextColor.apply(doc, headColor); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(titulo, 20, y + 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(55, 65, 81);
    doc.text(lineas, 20, y + 15);
    return y + alto + 6;
  }

  // ─── Informe completo ───────────────────────────────────────────────────────
  function generar(opts) {
    const nombre = opts.nombre || "Alumno";
    const curso = opts.curso || "";
    const ses = (opts.sesiones || []).filter(s => s.ppm && s.ppm > 0);
    if (!ses.length) { alert("No hay lecturas válidas para generar el informe."); return; }

    const jsPDF = (global.jspdf || {}).jsPDF;
    if (!jsPDF) { alert("No se pudo cargar el generador de PDF."); return; }
    const doc = new jsPDF();

    const objetivo = (typeof OBJETIVOS_PPM !== "undefined" && OBJETIVOS_PPM[curso]) || 90;
    const ultima = ses[ses.length - 1];
    const estado = estadoDe(ultima.ppm, objetivo);
    const hoy = new Date().toLocaleDateString("es-ES");
    const precisiones = ses.filter(s => s.precision != null).map(s => s.precision);
    const precMedia = precisiones.length ? Math.round(media(precisiones)) : null;
    const tend = tendenciaDe(ses.map(s => s.ppm));
    const verificadas = ses.filter(s => s.estado === "verificada" && s.niveles && Object.keys(s.niveles).length);
    const ultimaVerif = verificadas[verificadas.length - 1];

    let y = 0;
    const saltoSi = necesario => {
      if (y + necesario > 282) { doc.addPage(); y = 18; }
    };

    // Cabecera
    doc.setFillColor.apply(doc, VERDE);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("LectorIA", 14, 12);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Informe de progreso lector", 14, 21);
    doc.text(hoy, 196, 21, { align: "right" });

    // Alumno
    doc.setTextColor.apply(doc, TINTA);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(nombre, 14, 42);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, GRIS);
    const periodo = ses.length > 1 ? ` · del ${fmtFecha(ses[0].fecha)} al ${fmtFecha(ultima.fecha)}` : "";
    doc.text(`${curso} · ${ses.length} lectura(s)${periodo} · ${verificadas.length} verificada(s) por el profesional`, 14, 49);

    // Tarjetas de métricas
    const cajas = [
      { label: "PPM ACTUAL", valor: String(ultima.ppm), sub: tend != null ? (tend >= 0 ? `+${tend}` : String(tend)) + " PPM de tendencia" : "primera lectura", subColor: tend == null ? GRIS : tend >= 0 ? VERDE : ROJO },
      { label: "OBJETIVO " + curso, valor: String(objetivo), sub: Math.round((ultima.ppm / objetivo) * 100) + "% alcanzado", subColor: GRIS },
      { label: "PRECISIÓN MEDIA", valor: precMedia != null ? precMedia + "%" : "—", sub: ultima.precision != null ? "última: " + ultima.precision + "%" : "", subColor: GRIS },
      { label: "ESTADO", valor: "", sub: "", subColor: GRIS }
    ];
    const cw = 44, gap = 2;
    cajas.forEach((c, i) => {
      const cx = 14 + i * (cw + gap);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(cx, 55, cw, 24, 2.5, 2.5, "F");
      doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS); doc.setFont("helvetica", "normal");
      doc.text(c.label, cx + 4, 61);
      if (i === 3) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, estado.color);
        doc.text(estado.texto, cx + 4, 70);
      } else {
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, TINTA);
        doc.text(c.valor, cx + 4, 70);
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, c.subColor);
        doc.text(c.sub, cx + 4, 75.5);
      }
    });

    // Evolución de la velocidad
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, TINTA);
    doc.text("Evolución de la velocidad lectora", 14, 92);
    dibujarEvolucion(doc, 22, 97, 172, 42, ses, objetivo);
    y = 152;

    // Hoja de registro verificada
    if (ultimaVerif) {
      saltoSi(70);
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, TINTA);
      doc.text("Hoja de registro (verificada por el profesional)", 14, y);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, GRIS_CLARO);
      doc.text(`sesión del ${fmtFecha(ultimaVerif.fecha)} · 1 bajo · 2 medio · 3 alto`, 196, y, { align: "right" });
      y = dibujarNiveles(doc, y + 7, ultimaVerif.niveles) + 4;

      // Explicación de cómo se leen los niveles (evita que el color, ahora
      // neutro, se malinterprete: un "3" no siempre es bueno ni malo)
      const explic = "Cómo se leen los niveles (1 bajo · 2 medio · 3 alto): en velocidad, pausas y entonación y comprensión, un nivel más alto es mejor; en el resto (errores), el nivel indica cuánta dificultad se observa. La velocidad se calcula sobre el objetivo del curso, la entonación con el análisis de voz y los errores por su frecuencia cada 100 palabras. Silabeo, rotación y comprensión los valora el profesional por observación directa.";
      const linExp = doc.splitTextToSize(explic, 182);
      if (y + linExp.length * 3.3 > 286) { doc.addPage(); y = 18; }
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, GRIS);
      doc.text(linExp, 14, y);
      y += linExp.length * 3.3 + 5;
    }

    // Historial de lecturas
    saltoSi(30);
    doc.setDrawColor(229, 231, 235); doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, TINTA);
    doc.text("Historial de lecturas", 14, y);
    y += 7;

    const cabecera = () => {
      doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, GRIS);
      doc.text("FECHA", 14, y); doc.text("LECTURA", 31, y);
      doc.text("PPM", 96, y); doc.text("PREC.", 108, y);
      TIPOS_ERROR.forEach((t, k) => doc.text(t.corto.toUpperCase(), 126 + k * 10, y));
      doc.text("VERIF.", 196, y, { align: "right" });
      y += 5;
    };
    cabecera();

    ses.forEach((s, i) => {
      if (y > 278) { doc.addPage(); y = 20; cabecera(); }
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(13, y - 4, 184, 6.4, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(55, 65, 81);
      doc.text(fmtFecha(s.fecha), 14, y);
      doc.text(String(s.texto_titulo || s.texto_id || "Lectura " + (i + 1)).substring(0, 34), 31, y);
      const c = estadoDe(s.ppm, objetivo).color;
      doc.setTextColor.apply(doc, c); doc.setFont("helvetica", "bold");
      doc.text(String(s.ppm), 96, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(55, 65, 81);
      doc.text(s.precision != null ? s.precision + "%" : "—", 108, y);
      TIPOS_ERROR.forEach((t, k) => {
        const v = s[t.key] || 0;
        doc.setTextColor.apply(doc, v > 0 ? TINTA : GRIS_CLARO);
        doc.text(String(v), 126 + k * 10, y);
      });
      doc.setTextColor.apply(doc, s.estado === "verificada" ? VERDE : GRIS_CLARO);
      doc.text(s.estado === "verificada" ? "sí" : "—", 196, y, { align: "right" });
      y += 6.4;
    });

    // Leyenda de abreviaturas de la tabla
    y += 2;
    saltoSi(10);
    doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRIS_CLARO); doc.setFont("helvetica", "normal");
    doc.text(TIPOS_ERROR.map(t => t.corto + " = " + t.label.toLowerCase()).join(" · "), 14, y);
    y += 8;

    // ── Observaciones: estado general y tendencia ──
    const obs = [];
    if (tend != null) {
      obs.push(tend > 3
        ? `La velocidad lectora mejora: la tendencia es de +${tend} PPM entre las primeras y las últimas lecturas.`
        : tend < -3
        ? `La velocidad lectora ha descendido ${Math.abs(tend)} PPM respecto a las primeras lecturas; conviene revisar la dificultad de los textos.`
        : "La velocidad lectora se mantiene estable en las últimas lecturas.");
    }
    obs.push(ultima.ppm >= objetivo
      ? "Ha alcanzado el objetivo de velocidad de su curso. Se recomienda mantener la práctica y avanzar a textos de mayor complejidad."
      : ultima.ppm >= objetivo * 0.8
      ? `Está cerca del objetivo de su curso (${objetivo} PPM). Se recomienda práctica diaria de unos 10 minutos con textos de su nivel.`
      : "Necesita apoyo adicional para alcanzar el objetivo de su curso. Se recomiendan sesiones de lectura guiada con el profesional de referencia.");
    y = cajaTexto(doc, y, "Observaciones", obs, [240, 253, 244], [15, 110, 86]);

    // ── Propuesta de trabajo: recomendaciones según lo que más le cuesta ──
    const trabajo = propuestaTrabajo(ses, ultimaVerif);
    const propuestas = trabajo.length
      ? trabajo.map(t => (t.sev === 2 ? "Prioritario — " : "") + t.texto)
      : ["No se detectan dificultades específicas: mantener la práctica lectora habitual y ampliar poco a poco la complejidad de los textos."];
    y = cajaTexto(doc, y, "Propuesta de trabajo", propuestas, [245, 247, 250], TINTA);

    // Pie de página en todas las páginas
    const nPag = doc.getNumberOfPages();
    for (let p = 1; p <= nPag; p++) {
      doc.setPage(p);
      doc.setTextColor.apply(doc, GRIS_CLARO); doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("Generado por LectorIA · Plataforma de estimulación lectora", 105, 290, { align: "center" });
      doc.text(`${p} / ${nPag}`, 196, 290, { align: "right" });
    }

    doc.save(`informe_${nombre.replace(/ /g, "_")}_${hoy.replace(/\//g, "-")}.pdf`);
  }

  global.InformeLectorIA = { generar, propuestaTrabajo, TIPOS_ERROR };
})(typeof window !== "undefined" ? window : this);
