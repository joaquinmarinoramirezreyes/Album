const fs = require('fs');

let js = fs.readFileSync('app.js', 'utf8');

js = js.replace('function startGalleryListener() {', "function startGalleryListener() {\n  $galleryGrid.innerHTML = '';");

js = js.replace(
  /const existingCard = \$galleryGrid\.querySelector\(`\[data-id="\$\{id\}"\]`\);\s*if \(existingCard\) existingCard\.remove\(\);/,
  "const existingCards = $galleryGrid.querySelectorAll(`[data-id=\"${id}\"]`);\n        existingCards.forEach(c => c.remove());"
);

fs.writeFileSync('app.js', js, 'utf8');

// Now let's remove the emojis from React SinglesScreen
let react = fs.readFileSync('src/SinglesScreen.jsx', 'utf8');
react = react.replace('💘 Anotarme como soltero(a)', 'Anotarme como soltero(a)');
react = react.replace('💼', '<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"middle", marginRight: "4px"}}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>');
react = react.replace('🍽️ Mesa', '<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"middle", marginRight: "4px"}}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg> Mesa');

fs.writeFileSync('src/SinglesScreen.jsx', react, 'utf8');
console.log('done');
