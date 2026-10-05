const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('for (let row = 0; row < ROWS_PER_PAGE'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('cardIndex++;'));

const newBlock = \      for (let row = 0; row < ROWS_PER_PAGE && cardIndex < entries.length; row++) {
        for (let col = 0; col < COLS && cardIndex < entries.length; col++) {
          const entry = entries[cardIndex];
          const x = MARGIN + col * (colW + GAP_X);
          const y = MARGIN + 8 + row * (cardH + GAP_Y);

          // Fondo de tarjeta polaroid
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(220, 225, 235);
          doc.roundedRect(x, y, colW, cardH, 2, 2, 'FD');

          // Imagen
          if (entry.imgData) {
            try {
              doc.addImage(entry.imgData, 'JPEG', x + pMargin, y + pMargin, imgH, imgH);
            } catch (e) {
              doc.setFillColor(234, 240, 246);
              doc.rect(x + pMargin, y + pMargin, imgH, imgH, 'F');
              doc.setTextColor(130, 140, 160);
              doc.setFontSize(10);
              doc.text('Sin imagen', x + colW / 2, y + pMargin + imgH / 2, { align: 'center' });
            }
          } else {
            doc.setFillColor(234, 240, 246);
            doc.rect(x + pMargin, y + pMargin, imgH, imgH, 'F');
            doc.setTextColor(130, 140, 160);
            doc.setFontSize(10);
            doc.text('Sin imagen', x + colW / 2, y + pMargin + imgH / 2, { align: 'center' });
          }

          // Nombre (centrado, tipo marcador)
          doc.setTextColor(28, 35, 49);
          doc.setFont('times', 'bold');
          doc.setFontSize(14);
          const textY = y + pMargin + imgH + 8;
          doc.text(entry.nombre || '', x + colW / 2, textY, { align: 'center' });

          // Dedicatoria (centrada, cursiva)
          if (entry.dedicatoria) {
            doc.setFont('times', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(80, 85, 95);
            const maxTextW = colW - (pMargin * 2);
            const lineas = doc.splitTextToSize(entry.dedicatoria, maxTextW);
            doc.text(lineas.slice(0, 4), x + colW / 2, textY + 6, { align: 'center' });
          }

          cardIndex++;\

lines.splice(startIdx, endIdx - startIdx + 1, newBlock);
fs.writeFileSync('app.js', lines.join('\n'));
