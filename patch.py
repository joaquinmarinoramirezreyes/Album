import re

with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """// Cerrar modales (botones X)
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    $modalAdminAuth.hidden = true;
    $modalAdminPanel.hidden = true;
    if (typeof $modalHostAuth !== 'undefined' && $modalHostAuth) $modalHostAuth.hidden = true;
  });
});

// Modo Anfitrion
if ($btnHostModal) {
  $btnHostModal.addEventListener('click', () => {
    $modalHostAuth.hidden = false;
    $inputHostCode.focus();
  });
}

if ($formHostAuth) {
  $formHostAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeEvent = $inputHostCode.value.toUpperCase().trim();
    const pin = $inputHostPin.value.trim();
    const btnSubmit = $formHostAuth.querySelector('button[type="submit"]');
    
    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verificando...';
      $hostError.hidden = true;

      const eventRef = doc(db, 'eventos_activos', codeEvent);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists() && eventSnap.data().adminPin === pin) {
        // Exito
        localStorage.setItem('host_' + codeEvent, 'true');
        $modalHostAuth.hidden = true;
        $inputHostCode.value = '';
        $inputHostPin.value = '';
        
        // Autocompletar el login normal y simular submit
        const accessInput = document.getElementById('access-code');
        if (accessInput) {
            accessInput.value = codeEvent;
            document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        showToast('Modo Moderador activado. Puedes borrar fotos.', 'success', 5000);
      } else {
        $hostError.hidden = false;
      }
    } catch (err) {
      console.error(err);
      $hostError.hidden = false;
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Entrar como Moderador';
    }
  });
}"""

# Inject host logic
code = re.sub(r'// Cerrar modales \(botones X\).*?\}\);\n\}\);', replacement, code, flags=re.DOTALL)

# Inject delete button in gallery
gallery_replacement = """const card = document.createElement('article');
  card.className = 'polaroid';
  card.dataset.id = id;

  const isHost = localStorage.getItem('host_' + currentEventCode) === 'true';
  if (isHost) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-photo';
    delBtn.innerHTML = '🗑️';
    delBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
    delBtn.title = 'Borrar foto';
    
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Evitar abrir lightbox
      if (confirm('¿Seguro que quieres borrar permanentemente esta foto?')) {
        try {
          delBtn.disabled = true;
          delBtn.style.opacity = '0.5';
          await deleteDoc(doc(db, 'events', currentEventCode, 'guest_entries', id));
          showToast('Foto eliminada exitosamente', 'success');
          card.remove(); // Remove visually immediately
        } catch(err) {
          console.error(err);
          showToast('Error al eliminar la foto', 'error');
          delBtn.disabled = false;
          delBtn.style.opacity = '1';
        }
      }
    });
    card.appendChild(delBtn);
  }"""

code = re.sub(r"const card = document\.createElement\('article'\);\n\s*card\.className = 'polaroid';\n\s*card\.dataset\.id = id;", gallery_replacement, code)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied.")
