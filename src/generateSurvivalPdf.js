/**
 * Generador de PDF exclusivo para "La Bóveda de Supervivencia".
 * Diseño "Edición Nocturna de Lujo" completamente distinto al álbum normal:
 * - Paleta Deep Midnight (#0A0E1A / #141D33) con acentos en oro (#D4AF37 / #F3C766)
 * - Portada conmemorativa con sello de Bóveda y metadatos
 * - Tarjetas oscuras tipo Polaroid de Madrugada con hora exacta y badge de sobreviviente
 * - Certificado final de mención de honor a todos los sobrevivientes
 */

function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const dx = (img.naturalWidth - side) / 2;
        const dy = (img.naturalHeight - side) / 2;
        c.width = side;
        c.height = side;
        c.getContext('2d').drawImage(img, dx, dy, side, side, 0, 0, side, side);
        resolve(c.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url.startsWith('data:') ? url : url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

function formatCaptureTime(timestamp) {
  if (!timestamp) return 'Madrugada';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const VAULT_PALETTES = {
  marli: {
    brandName: 'MARLI CERÁMICA',
    slogan: '«Hecho a mano, no en serie • Marli Cerámica»',
    bg: [10, 14, 26],              // Noche azul medianoche
    bgPage: [14, 20, 36],
    headerBar: [20, 28, 48],
    emblemBg: [20, 28, 48],
    cardBg: [23, 32, 51],
    cardBorder: [45, 62, 94],
    primaryAccent: [212, 175, 55],  // Oro
    secondaryAccent: [243, 199, 102], // Oro claro
    metaBoxBg: [18, 25, 42],
    metaBoxBorder: [38, 52, 82],
    textLight: [203, 213, 225],
    textMuted: [148, 163, 184],
  },
  shots: {
    brandName: 'CERÁMICA SHOTS',
    slogan: '«Cerámica lenta en un mundo rápido • Cerámica Shots»',
    bg: [22, 13, 9],               // Noche cálida terracota / obsidiana
    bgPage: [30, 19, 14],
    headerBar: [42, 26, 18],
    emblemBg: [42, 26, 18],
    cardBg: [40, 25, 19],
    cardBorder: [82, 52, 38],
    primaryAccent: [229, 169, 60],  // Ámbar / Bronce cálido
    secondaryAccent: [246, 201, 120], // Ámbar claro
    metaBoxBg: [34, 22, 16],
    metaBoxBorder: [78, 48, 34],
    textLight: [238, 222, 212],
    textMuted: [180, 155, 142],
  },
  odimar: {
    brandName: 'CERÁMICA ODIMAR',
    slogan: '«Imperfecta como todo lo hecho a mano • Cerámica Odimar»',
    bg: [23, 12, 20],              // Noche ciruela / vino profundo
    bgPage: [32, 17, 28],
    headerBar: [46, 25, 40],
    emblemBg: [46, 25, 40],
    cardBg: [44, 24, 38],
    cardBorder: [90, 48, 78],
    primaryAccent: [235, 140, 130], // Oro rosa / Coral elegante
    secondaryAccent: [248, 195, 190], // Champán rosa
    metaBoxBg: [36, 20, 32],
    metaBoxBorder: [82, 44, 72],
    textLight: [238, 218, 228],
    textMuted: [185, 155, 172],
  }
};

export async function generateSurvivalPdf({
  eventCode,
  config,
  photos = [],
  eventTypeLabel = 'Evento',
  themeKey = 'marli',
  onProgress = () => {}
}) {
  if (typeof window.jspdf === 'undefined') {
    throw new Error('La librería de PDF no está disponible. Revisa tu conexión a internet.');
  }

  if (!photos || photos.length === 0) {
    throw new Error('Aún no hay fotografías registradas en la bóveda para exportar.');
  }

  const pKey = (themeKey || window.currentThemeKey || 'marli').toLowerCase();
  const palette = VAULT_PALETTES[pKey] || VAULT_PALETTES.marli;

  onProgress('Iniciando Bóveda en PDF...');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const H = 297; // A4 standard

  // ══════════════════════════════════════════════════════════
  //  1. PORTADA CONMEMORATIVA (GAMA NOCTURNA EXCLUSIVA)
  // ══════════════════════════════════════════════════════════
  onProgress('Diseñando portada de honor...');

  // Fondo noche profunda según la marca
  doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
  doc.rect(0, 0, W, H, 'F');

  // Marco ornamental de honor
  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, W - 24, H - 24);

  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.3);
  doc.rect(15, 15, W - 30, H - 30);

  // Esquinas decorativas
  const drawCorner = (cx, cy) => {
    doc.setFillColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
    doc.circle(cx, cy, 1.2, 'F');
  };
  drawCorner(15, 15);
  drawCorner(W - 15, 15);
  drawCorner(15, H - 15);
  drawCorner(W - 15, H - 15);

  // Emblema Central de la Bóveda
  doc.setFillColor(palette.emblemBg[0], palette.emblemBg[1], palette.emblemBg[2]);
  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.8);
  doc.circle(W / 2, 64, 18, 'FD');

  // Ícono interior de candado/bóveda
  doc.setDrawColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(W / 2 - 7, 62, 14, 10, 1.5, 1.5);
  // Arco superior del candado
  {
    const r = 5, cx0 = W / 2, cy0 = 62, steps = 24;
    let prev = [cx0 - r, cy0];
    for (let s = 1; s <= steps; s++) {
      const a = Math.PI - (Math.PI * s) / steps;
      const next = [cx0 + r * Math.cos(a), cy0 - r * Math.sin(a)];
      doc.line(prev[0], prev[1], next[0], next[1]);
      prev = next;
    }
  }

  // Título de la Bóveda
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  const mainTitle = (config?.title || 'LA BÓVEDA SECRETA').toUpperCase();
  doc.text(mainTitle, W / 2, 104, { align: 'center' });

  // Subtítulo en tono acento
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
  doc.setFontSize(13);
  doc.text('Edición Oficial de Sobrevivientes', W / 2, 114, { align: 'center' });

  // Línea divisoria de honor
  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 35, 122, W / 2 + 35, 122);
  doc.setFillColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.circle(W / 2, 122, 1.2, 'F');

  // Descripción
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(palette.textLight[0], palette.textLight[1], palette.textLight[2]);
  doc.setFontSize(10);
  doc.text('Fotografías desclasificadas tomadas en el momento cumbre del evento.', W / 2, 134, { align: 'center' });
  doc.text('El registro de quienes demostraron que seguían de pie.', W / 2, 140, { align: 'center' });

  // Tarjeta de Metadatos del Evento
  doc.setFillColor(palette.metaBoxBg[0], palette.metaBoxBg[1], palette.metaBoxBg[2]);
  doc.setDrawColor(palette.metaBoxBorder[0], palette.metaBoxBorder[1], palette.metaBoxBorder[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(W / 2 - 65, 156, 130, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
  doc.text('REGISTRO OFICIAL DE DESCLASIFICACIÓN', W / 2, 166, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.text(`CÓDIGO DE EVENTO: ${eventCode.toUpperCase()} • ${eventTypeLabel.toUpperCase()}`, W / 2, 176, { align: 'center' });

  if (config?.unlockAt) {
    const unlockDate = new Date(config.unlockAt);
    const dateStr = unlockDate.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    doc.setTextColor(palette.textLight[0], palette.textLight[1], palette.textLight[2]);
    doc.text(`HORA DEL RETO: ${timeStr} hrs • ${dateStr}`, W / 2, 185, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
  doc.text(`TOTAL REGISTRADOS: ${photos.length} SOBREVIVIENTES`, W / 2, 194, { align: 'center' });

  // Pie de la portada
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
  doc.setFontSize(9);
  doc.text(palette.slogan, W / 2, 268, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  //  2. PROCESAMIENTO DE FOTOGRAFÍAS
  // ══════════════════════════════════════════════════════════
  onProgress('Procesando imágenes de los sobrevivientes...');
  const processedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    onProgress(`Optimizando foto ${i + 1} de ${photos.length}...`);
    const b64 = await loadImageAsBase64(p.photoUrl);
    processedPhotos.push({
      author: p.author || 'Invitado anónimo',
      caption: p.caption || '',
      timeStr: formatCaptureTime(p.timestamp),
      imgData: b64,
    });
  }

  // ══════════════════════════════════════════════════════════
  //  3. PÁGINAS DE FOTOGRAFÍAS (2x2 GRID NOCTURNO)
  // ══════════════════════════════════════════════════════════
  onProgress('Generando galería de la bóveda...');

  const MARGIN = 16;
  const TOP_OFFSET = 20;
  const GAP_X = 12;
  const GAP_Y = 14;
  const COLS = 2;
  const colW = (W - MARGIN * 2 - GAP_X * (COLS - 1)) / COLS; // ~83mm
  const pPad = 4;
  const imgW = colW - (pPad * 2); // ~75mm
  const imgH = imgW; // 1:1 Cuadrado
  const textH = 34; // Nombre, hora y dedicatoria
  const cardH = pPad + imgH + textH; // ~113mm
  const ROWS_PER_PAGE = 2;

  let photoIndex = 0;
  let pageNumber = 1;

  while (photoIndex < processedPhotos.length) {
    doc.addPage();
    pageNumber++;

    // Fondo nocturno de página
    doc.setFillColor(palette.bgPage[0], palette.bgPage[1], palette.bgPage[2]);
    doc.rect(0, 0, W, H, 'F');

    // Barra superior de encabezado
    doc.setFillColor(palette.headerBar[0], palette.headerBar[1], palette.headerBar[2]);
    doc.rect(0, 0, W, 12, 'F');
    doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
    doc.setLineWidth(0.4);
    doc.line(0, 12, W, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('LA BÓVEDA SECRETA • SOBREVIVIENTES', MARGIN, 8);

    doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
    doc.text(`ARCHIVO: ${eventCode.toUpperCase()}`, W - MARGIN, 8, { align: 'right' });

    // Renderizar tarjetas de la página
    for (let row = 0; row < ROWS_PER_PAGE && photoIndex < processedPhotos.length; row++) {
      for (let col = 0; col < COLS && photoIndex < processedPhotos.length; col++) {
        const item = processedPhotos[photoIndex];
        const x = MARGIN + col * (colW + GAP_X);
        const y = TOP_OFFSET + row * (cardH + GAP_Y);

        // Fondo de tarjeta Polaroid Nocturna
        doc.setFillColor(palette.cardBg[0], palette.cardBg[1], palette.cardBg[2]);
        doc.setDrawColor(palette.cardBorder[0], palette.cardBorder[1], palette.cardBorder[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, colW, cardH, 3, 3, 'FD');

        // Imagen
        if (item.imgData) {
          try {
            doc.addImage(item.imgData, 'JPEG', x + pPad, y + pPad, imgW, imgH);
          } catch (e) {
            doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
            doc.rect(x + pPad, y + pPad, imgW, imgH, 'F');
            doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
            doc.setFontSize(8);
            doc.text('Foto no disponible', x + colW / 2, y + pPad + imgH / 2, { align: 'center' });
          }
        } else {
          doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
          doc.rect(x + pPad, y + pPad, imgW, imgH, 'F');
          doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
          doc.setFontSize(8);
          doc.text('Foto no disponible', x + colW / 2, y + pPad + imgH / 2, { align: 'center' });
        }

        // Borde fino para la foto
        doc.setDrawColor(palette.bg[0], palette.bg[1], palette.bg[2]);
        doc.setLineWidth(0.3);
        doc.rect(x + pPad, y + pPad, imgW, imgH);

        // Badge de Hora de Captura
        const badgeY = y + pPad + imgH + 3;
        doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
        doc.roundedRect(x + pPad, badgeY, imgW, 5.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
        doc.text(`CAPTURA: ${item.timeStr}`, x + colW / 2, badgeY + 4, { align: 'center' });

        // Nombre del sobreviviente
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10.5);
        const nameY = badgeY + 11;
        doc.text(item.author, x + colW / 2, nameY, { align: 'center' });

        // Dedicatoria / Frase
        if (item.caption) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(palette.textLight[0], palette.textLight[1], palette.textLight[2]);
          doc.setFontSize(8);
          const lines = doc.splitTextToSize(`"${item.caption}"`, colW - 8);
          doc.text(lines.slice(0, 2), x + colW / 2, nameY + 5.5, { align: 'center' });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
          doc.setFontSize(7);
          doc.text('SOBREVIVIENTE CERTIFICADO', x + colW / 2, nameY + 5.5, { align: 'center' });
        }

        photoIndex++;
      }
    }

    // Pie de página
    doc.setDrawColor(palette.metaBoxBorder[0], palette.metaBoxBorder[1], palette.metaBoxBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, H - 10, W - MARGIN, H - 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
    doc.setFontSize(7.5);
    doc.text(`La Bóveda Secreta • Edición Especial • pág. ${pageNumber - 1}`, W / 2, H - 5.5, { align: 'center' });
  }

  // ══════════════════════════════════════════════════════════
  //  4. PÁGINA FINAL: CERTIFICADO DE MENCIÓN DE HONOR
  // ══════════════════════════════════════════════════════════
  onProgress('Añadiendo certificado de honor...');
  doc.addPage();

  doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
  doc.rect(0, 0, W, H, 'F');

  // Marco de certificado
  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.8);
  doc.rect(14, 14, W - 28, H - 28);
  doc.setLineWidth(0.3);
  doc.rect(17, 17, W - 34, H - 34);

  // Título Certificado
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setFontSize(18);
  doc.text('CERTIFICADO DE SUPERVIVENCIA', W / 2, 45, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('Mención de Honor a todos los presentes', W / 2, 53, { align: 'center' });

  doc.setDrawColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 40, 58, W / 2 + 40, 58);

  // Mensaje
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(palette.textLight[0], palette.textLight[1], palette.textLight[2]);
  doc.setFontSize(9.5);
  const certLines = [
    'Por haber formado parte de la historia y demostrar una resistencia legendaria,',
    'este reconocimiento queda inmortalizado en el álbum oficial del evento.',
    'Gracias por su alegría, su energía y por hacer de esta noche algo inolvidable.'
  ];
  doc.text(certLines, W / 2, 70, { align: 'center', lineHeightFactor: 1.5 });

  // Lista de Nombres de Sobrevivientes
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.secondaryAccent[0], palette.secondaryAccent[1], palette.secondaryAccent[2]);
  doc.setFontSize(10);
  doc.text('LISTA OFICIAL DE SOBREVIVIENTES:', W / 2, 98, { align: 'center' });

  // Cuadro con nombres
  doc.setFillColor(palette.metaBoxBg[0], palette.metaBoxBg[1], palette.metaBoxBg[2]);
  doc.setDrawColor(palette.metaBoxBorder[0], palette.metaBoxBorder[1], palette.metaBoxBorder[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(26, 104, W - 52, 120, 3, 3, 'FD');

  const names = processedPhotos.map((p) => p.author);
  const maxPerCol = 14;
  const colsCount = names.length > maxPerCol ? 2 : 1;
  const colWidth = (W - 52) / colsCount;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);

  const MAX_NAMES = 28;
  const shownNames = names.length > MAX_NAMES
    ? [...names.slice(0, MAX_NAMES - 1), `y ${names.length - (MAX_NAMES - 1)} más`]
    : names;
  shownNames.forEach((name, idx) => {
    const colIdx = Math.floor(idx / maxPerCol);
    const rowIdx = idx % maxPerCol;
    const nx = 26 + (colIdx * colWidth) + (colWidth / 2);
    const ny = 112 + (rowIdx * 7.5);
    const label = name.length > 30 ? name.slice(0, 29) + '…' : name;
    doc.text(idx === MAX_NAMES - 1 && names.length > MAX_NAMES ? label : `• ${label}`, nx, ny, { align: 'center' });
  });

  // Firma / Sello
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(palette.textMuted[0], palette.textMuted[1], palette.textMuted[2]);
  doc.setFontSize(9);
  doc.text('«La fiesta concluye, pero los recuerdos quedan para siempre.»', W / 2, 245, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.primaryAccent[0], palette.primaryAccent[1], palette.primaryAccent[2]);
  doc.setFontSize(10);
  doc.text(palette.brandName, W / 2, 255, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  //  5. GUARDAR Y DESCARGAR
  // ══════════════════════════════════════════════════════════
  onProgress('Finalizando documento...');
  const fileName = `boveda-supervivencia-${eventCode.toLowerCase()}.pdf`;
  doc.save(fileName);
  return fileName;
}
