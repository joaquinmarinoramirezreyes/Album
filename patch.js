const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');
const nav = `// ── Flechas de navegación del navegador (atrás / adelante) ──
if (location.hash === '#album') history.replaceState(null, '', location.pathname);

window.addEventListener('popstate', () => {
  const albumActive = $albumScreen.classList.contains('screen--active');
  if (albumActive) {
    document.querySelectorAll('.lightbox:not([hidden])').forEach(el => { el.hidden = true; });
    if (unsubscribeGallery) { unsubscribeGallery(); unsubscribeGallery = null; }
    currentEventId = null;
    transitionScreens($albumScreen, $loginScreen);
  } else if (history.state && history.state.screen === 'album') {
    history.replaceState(null, '', location.pathname);
  }
});

`;
const marker = "$photoBtn.addEventListener('click'";
if (!c.includes("addEventListener('popstate'")) c = c.replace(marker, nav + marker);
fs.writeFileSync('app.js', c, 'utf8');
console.log(c.includes("addEventListener('popstate'") ? 'OK' : 'FAILED');
