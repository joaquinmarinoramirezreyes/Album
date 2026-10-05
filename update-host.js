const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'app.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add references to new UI elements
content = content.replace(
  "const $inputEventDate  = document.getElementById('input-event-date');",
  "const $inputEventDate  = document.getElementById('input-event-date');\nconst $inputEventPin   = document.getElementById('input-event-pin');"
);

content = content.replace(
  "const $btnAdminModal = document.getElementById('btn-admin-modal');",
  "const $btnAdminModal = document.getElementById('btn-admin-modal');\nconst $btnHostModal = document.getElementById('btn-host-modal');\nconst $modalHostAuth = document.getElementById('modal-host-auth');\nconst $formHostAuth = document.getElementById('form-host-auth');\nconst $inputHostCode = document.getElementById('input-host-code');\nconst $inputHostPin = document.getElementById('input-host-pin');\nconst $hostError = document.getElementById('host-error');"
);

// 2. Add PIN saving to formCreateEvent
content = content.replace(
  "const eventDate = $inputEventDate.value; // Formato YYYY-MM-DD",
  "const eventDate = $inputEventDate.value; // Formato YYYY-MM-DD\n  const eventPin = $inputEventPin.value.trim();"
);

content = content.replace(
  "await setDoc(eventRef, {\n        creadoEn: serverTimestamp(),\n        activo: true,\n        fechaEvento: eventDate\n      });",
  "await setDoc(eventRef, {\n        creadoEn: serverTimestamp(),\n        activo: true,\n        fechaEvento: eventDate,\n        adminPin: eventPin || null\n      });"
);

content = content.replace(
  "$inputNewEvent.value = '';\n      $inputEventDate.value = '';",
  "$inputNewEvent.value = '';\n      $inputEventDate.value = '';\n      $inputEventPin.value = '';"
);

// 3. Add Host Login Logic
const hostLoginLogic = \
if (\) {
  \.addEventListener('click', () => {
    \.hidden = false;
    \.focus();
  });
}

if (\) {
  \.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = \.value.toUpperCase().trim();
    const pin = \.value.trim();
    const btnSubmit = \.querySelector('button[type=\"submit\"]');
    
    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verificando...';
      \.hidden = true;

      const eventRef = doc(db, 'eventos_activos', code);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists() && eventSnap.data().adminPin === pin) {
        // Exito
        localStorage.setItem('host_' + code, 'true');
        \.hidden = true;
        \.value = '';
        \.value = '';
        
        // Autocompletar el login normal y simular submit
        document.getElementById('access-code').value = code;
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
        showToast('Modo moderador activado', 'success');
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

content = content.replace(
  "// Cerrar modales con boton de cierre",
  hostLoginLogic + "\n\n  // Cerrar modales con boton de cierre"
);

fs.writeFileSync(file, content, 'utf8');
