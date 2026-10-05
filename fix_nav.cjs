const fs = require('fs');

// 1. app.js
let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(
  'if (albumActive) {\n    document.querySelectorAll',
  "if (albumActive) {\n    if (location.hash === '#album' || location.hash === '#singles') {\n      window.dispatchEvent(new CustomEvent('legacy:tab', { detail: location.hash.replace('#', '') }));\n      return;\n    }\n    document.querySelectorAll"
);
fs.writeFileSync('app.js', appJs, 'utf8');

// 2. src/main.jsx
let mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

mainJsx = mainJsx.replace(
  'const onExit = () => { setSession(null); setTab(\'album\'); };',
  "const onExit = () => { setSession(null); setTab('album'); };\n    const onTab = (e) => { setTab(e.detail); };"
);

mainJsx = mainJsx.replace(
  "window.addEventListener('legacy:exit', onExit);",
  "window.addEventListener('legacy:exit', onExit);\n    window.addEventListener('legacy:tab', onTab);"
);

mainJsx = mainJsx.replace(
  "window.removeEventListener('legacy:exit', onExit);",
  "window.removeEventListener('legacy:exit', onExit);\n      window.removeEventListener('legacy:tab', onTab);"
);

// Add handleSetTab function
mainJsx = mainJsx.replace(
  "useEffect(() => {\n    document.body.classList.toggle('show-singles', tab === 'singles');",
  "const handleSetTab = (newTab) => {\n    if (newTab === tab) return;\n    history.pushState({ screen: 'album', tab: newTab }, '', '#' + newTab);\n    setTab(newTab);\n  };\n\n  useEffect(() => {\n    document.body.classList.toggle('show-singles', tab === 'singles');"
);

// Replace setTab with handleSetTab in onClick
mainJsx = mainJsx.replace(/onClick=\{\(\) => setTab\('album'\)\}/g, "onClick={() => handleSetTab('album')}");
mainJsx = mainJsx.replace(/onClick=\{\(\) => setTab\('singles'\)\}/g, "onClick={() => handleSetTab('singles')}");

fs.writeFileSync('src/main.jsx', mainJsx, 'utf8');
console.log('done');
