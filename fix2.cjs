const fs = require('fs');

// 1. main.jsx: Replace emojis with SVGs
let main = fs.readFileSync('src/main.jsx', 'utf8');
main = main.replace(/>[^<]*Álbum</g, '><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"6px"}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Álbum<');
main = main.replace(/>[^<]*Solteros</g, '><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"6px"}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Solteros<');
fs.writeFileSync('src/main.jsx', main, 'utf8');

// 2. styles.css: smaller grid minmax
let css = fs.readFileSync('styles.css', 'utf8');
css = css.replace('minmax(240px, 1fr)', 'minmax(140px, 1fr)');
// Fix single card styles to ensure image keeps ratio but fits, cursor pointer
if (!css.includes('.single-card__img { cursor: pointer;')) {
  css = css.replace('.single-card__img {', '.single-card__img { cursor: pointer;');
}
fs.writeFileSync('styles.css', css, 'utf8');
console.log('done');
