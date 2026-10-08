const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(
  /let fallbackTimer;[\s\S]*?window\.dispatchEvent\(new CustomEvent\('open-coverflow'\)\);\s*return;/,
  `let fallbackTimer;
      const fallbackHandler = () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('coverflow-failed', fallbackHandler);
        startOldSlideshow();
      };
      const receivedHandler = () => {
        clearTimeout(fallbackTimer); // Confirmación inmediata de recepción, cancela el timer
      };
      window.addEventListener('coverflow-failed', fallbackHandler); // Permanece activo durante la presentación
      window.addEventListener('coverflow-received', receivedHandler, { once: true });
      
      fallbackTimer = setTimeout(fallbackHandler, 500);
      window.dispatchEvent(new CustomEvent('open-coverflow'));
      return;`
);
fs.writeFileSync('app.js', appJs, 'utf8');

let effJs = fs.readFileSync('effects-3d.js', 'utf8');
effJs = effJs.replace(
  /window\.dispatchEvent\(new CustomEvent\('coverflow-success'\)\);[\s\S]*?renderCoverflow\(\);[\s\S]*?startCoverflowTimer\(\);/,
  `window.dispatchEvent(new CustomEvent('coverflow-received'));
    
    coverflowModal.hidden = false;
    
    try {
      renderCoverflow();
      startCoverflowTimer();
    } catch(renderError) {
      throw renderError;
    }`
);
fs.writeFileSync('effects-3d.js', effJs, 'utf8');

let css = fs.readFileSync('effects-3d.css', 'utf8');
css = css.replace(/!important/g, '');
// Verify coverflow-card doesn't lack backface-visibility
if (!css.includes('backface-visibility: hidden;') && css.includes('.coverflow-card')) {
   // Wait, coverflow-card is purely 3D transformed, it doesn't need backface-visibility unless it has a back face.
}
fs.writeFileSync('effects-3d.css', css, 'utf8');

console.log('Fixes applied.');
