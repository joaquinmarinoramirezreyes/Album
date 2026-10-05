const fs = require('fs');
const old = fs.readFileSync('tmp_old_app.js', 'utf8');
const cur = fs.readFileSync('app.js', 'utf8');

const startIdx = old.indexOf('\.addEventListener');
const endMarker = '  });\r\n\r\n// ═══════════════════════════════════════════════════════════\r\n//  SLIDESHOW';
let endIdx = old.indexOf(endMarker);
if(endIdx === -1) endIdx = old.indexOf('  });\n\n// ═══════════════════════════════════════════════════════════\n//  SLIDESHOW');

const pdfCode = old.substring(startIdx, endIdx + 5);

// now remove the broken one from cur
const brokenStart = cur.indexOf('//  DESCARGAR '); // matches DESCARGAR ÁLBUM EN PDF
if(brokenStart > -1) {
  const cleanCur = cur.substring(0, brokenStart - 6);
  fs.writeFileSync('app.js', cleanCur + '\n\n// ═══════════════════════════════════════════════════════════\n//  DESCARGAR ÁLBUM EN PDF (RESTAURADO)\n// ═══════════════════════════════════════════════════════════\nconst \\ = document.getElementById(\\'download-pdf\\');\nif (\\) {\n' + pdfCode + '\n}\n');
}
