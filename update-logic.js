const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Add the DOM elements if not present
if (!code.includes('const $btnHostModal')) {
  code = code.replace(
    /const \ = document\.getElementById\('btn-admin-modal'\);/,
    "const \ = document.getElementById('btn-admin-modal');\nconst \  = document.getElementById('btn-host-modal');"
  );
  code = code.replace(
    /const \ = document\.getElementById\('modal-admin-auth'\);/,
    "const \ = document.getElementById('modal-admin-auth');\nconst \ = document.getElementById('modal-host-auth');"
  );
  code = code.replace(
    /const \ = document\.getElementById\('form-admin-auth'\);/,
    "const \ = document.getElementById('form-admin-auth');\nconst \  = document.getElementById('form-host-auth');"
  );
  code = code.replace(
    /const \ = document\.getElementById\('input-admin-pass'\);/,
    "const \ = document.getElementById('input-admin-pass');\nconst \ = document.getElementById('input-host-code');\nconst \  = document.getElementById('input-host-pin');"
  );
  code = code.replace(
    /const \    = document\.getElementById\('admin-error'\);/,
    "const \    = document.getElementById('admin-error');\nconst \     = document.getElementById('host-error');"
  );
  code = code.replace(
    /const \  = document\.getElementById\('input-event-date'\);/,
    "const \  = document.getElementById('input-event-date');\nconst \   = document.getElementById('input-event-pin');"
  );
}

// 2. Add PIN saving
if (!code.includes('const eventPin = \.value.trim();')) {
  code = code.replace(
    /const eventDate = \\.value;.*/,
    "const eventDate = \.value;\n    const eventPin = \.value.trim();"
  );
  code = code.replace(
    /fechaEvento: eventDate,?\s*activo: true/,
    "fechaEvento: eventDate,\n        activo: true,\n        adminPin: eventPin || null"
  );
  code = code.replace(
    /\\.value = '';/,
    "\.value = '';\n      \.value = '';"
  );
}

// 3. Add Host Login Logic
if (!code.includes('formHostAuth.addEventListener')) {
  const hostLogic = \
// Modo Anfitrion
if (\) {
  \.addEventListener('click', () => {
    \.hidden = false;
    \.focus();
  });
}

if (\) {
  \.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeEvent = \.value.toUpperCase().trim();
    const pin = \.value.trim();
    const btnSubmit = \.querySelector('button[type=\"submit\"]');
    
    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verificando...';
      \.hidden = true;

      const eventRef = doc(db, 'eventos_activos', codeEvent);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists() && eventSnap.data().adminPin === pin) {
        // Exito
        localStorage.setItem('host_' + codeEvent, 'true');
        \.hidden = true;
        \.value = '';
        \.value = '';
        
        // Autocompletar el login normal y simular submit
        document.getElementById('access-code').value = codeEvent;
        document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        showToast('Modo Moderador activado. Puedes borrar fotos.', 'success', 5000);
      } else {
        \.hidden = false;
      }
    } catch (err) {
      console.error(err);
      \.hidden = false;
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Entrar como Moderador';
    }
  });
}
\;
  code = code.replace(
    "// Cerrar modales con boton de cierre",
    hostLogic + "\n// Cerrar modales con boton de cierre"
  );
}

// 4. Add Delete button in renderGallery
if (!code.includes('btn-delete-photo')) {
  code = code.replace(
    /const card = document\.createElement\('div'\);\s*card\.className = 'polaroid';/,
    \const card = document.createElement('div');
      card.className = 'polaroid';
      
      const isHost = localStorage.getItem('host_' + currentEventCode) === 'true';
      if (isHost) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-photo';
        delBtn.innerHTML = '🗑️';
        delBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; z-index: 10;';
        delBtn.title = 'Borrar foto';
        
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // Evitar abrir lightbox
          if (confirm('¿Seguro que quieres borrar permanentemente esta foto?')) {
            try {
              await deleteDoc(doc(db, 'events', currentEventCode, 'guest_entries', entryId));
              showToast('Foto eliminada exitosamente', 'success');
            } catch(err) {
              console.error(err);
              showToast('Error al eliminar la foto', 'error');
            }
          }
        });
        card.appendChild(delBtn);
      }\
  );
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('Modifications completed.');
