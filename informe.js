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

  // Consejo pedagógico según el tipo de error más frecuente
  const CONSEJOS = {
    omisiones:       "Trabajar el seguimiento visual de la línea (leer señalando con el dedo o con una regla) para reducir las omisiones.",
    sustituciones:   "Practicar la lectura pausada de palabras aisladas y pseudopalabras, prestando atención a la exactitud antes que a la velocidad.",
    inversiones:     "Reforzar la conciencia fonológica con actividades de ordenar sílabas y sonidos dentro de la palabra.",
    adiciones:       "Leer despacio marcando cada palabra para evitar añadir palabras que no están en el texto.",
    repeticiones:    "Realizar lecturas repetidas del mismo texto hasta leerlo con seguridad, para ganar fluidez.",
    rectificaciones: "Fomentar una primera lectura silenciosa del texto antes de leerlo en voz alta.",
    vacilaciones:    "Practicar con listas de palabras de uso frecuente para ganar automatismo en el reconocimiento."
  };

  const VERDE = [29, 158, 117], AMBAR = [239, 159, 39], ROJO = [226, 75, 74];
  const TINTA = [17, 17, 17], GRIS = [107, 114, 128], GRIS_CLARO = [156, 163, 175];

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
        // Tres casillas 1·2·3, la activa coloreada según sea dimensión positiva o de dificultad
        for (let n = 1; n <= 3; n++) {
          const bx = colX[col] + colW - (4 - n) * 9;
          const activa = val === n;
          let c = [243, 244, 246];
          if (activa) c = d.positivo
            ? (n === 3 ? [225, 245, 238] : n === 2 ? [250, 238, 218] : [252, 235, 235])
            : (n === 1 ? [225, 245, 238] : n === 2 ? [250, 238, 218] : [252, 235, 235]);
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
    doc.text(`${curso} · ${ses.length} lectura(s)${periodo} · ${verificadas.length} verificada(s) por el docente`, 14, 49);

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
      doc.text("Hoja de registro (verificada por el docente)", 14, y);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, GRIS_CLARO);
      doc.text(`sesión del ${fmtFecha(ultimaVerif.fecha)} · 1 bajo · 2 medio · 3 alto`, 196, y, { align: "right" });
      y = dibujarNiveles(doc, y + 7, ultimaVerif.niveles) + 4;
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

    // Observaciones y recomendaciones
    const bullets = [];
    if (tend != null) {
      bullets.push(tend > 3
        ? `La velocidad lectora mejora: la tendencia es de ${tend} PPM entre las primeras y las últimas lecturas.`
        : tend < -3
        ? `La velocidad lectora ha descendido ${Math.abs(tend)} PPM respecto a las primeras lecturas; conviene revisar la dificultad de los textos.`
        : "La velocidad lectora se mantiene estable en las últimas lecturas.");
    }
    bullets.push(ultima.ppm >= objetivo
      ? "Ha alcanzado el objetivo de velocidad de su curso. Se recomienda mantener la práctica y avanzar a textos de mayor complejidad."
      : ultima.ppm >= objetivo * 0.8
      ? `Está cerca del objetivo de su curso (${objetivo} PPM). Se recomienda práctica diaria de unos 10 minutos con textos de su nivel.`
      : "Necesita apoyo adicional para alcanzar el objetivo de su curso. Se recomiendan sesiones de lectura guiada con el orientador educativo.");

    // Error dominante en las últimas 5 lecturas
    const recientes = ses.slice(-5);
    let dominante = null, maxErr = 0;
    TIPOS_ERROR.forEach(t => {
      const tot = recientes.reduce((s, r) => s + (r[t.key] || 0), 0);
      if (tot > maxErr) { maxErr = tot; dominante = t; }
    });
    if (dominante && maxErr >= 3) {
      bullets.push(`El error más frecuente en las últimas lecturas es de tipo ${dominante.label.toLowerCase()} (${maxErr}). ${CONSEJOS[dominante.key]}`);
    }
    if (ultimaVerif && ultimaVerif.niveles.comprension === 1) {
      bullets.push("La comprensión lectora se valoró como baja en la última verificación: conviene acompañar cada lectura con preguntas orales sobre el texto.");
    }

    doc.setFontSize(9);
    const lineas = [];
    bullets.forEach(b => doc.splitTextToSize("•  " + b, 168).forEach(l => lineas.push(l)));
    const altoCaja = lineas.length * 4.6 + 14;
    saltoSi(altoCaja + 4);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, y, 182, altoCaja, 3, 3, "F");
    doc.setTextColor(15, 110, 86); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Observaciones y recomendaciones", 20, y + 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(lineas, 20, y + 15);

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

  global.InformeLectorIA = { generar, TIPOS_ERROR };
})(typeof window !== "undefined" ? window : this);
