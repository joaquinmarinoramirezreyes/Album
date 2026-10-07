/**
 * effects-3d.js
 * Lógica aislada para efectos 3D avanzados
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (prefersReducedMotion || !isPointerFine) {
    return;
  }

  const galleryGrid = document.getElementById('gallery-grid');
  if (!galleryGrid) return;

  galleryGrid.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.polaroid, .single-card');
    if (!card) return;

    let overlay = card.querySelector('.glow-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'glow-overlay';
      card.appendChild(overlay);
    }

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty('--mouse-x', x + 'px');
    card.style.setProperty('--mouse-y', y + 'px');
  });

  let initialRenderComplete = false;

  const observer = new MutationObserver((mutations) => {
    let newPhotosCount = 0;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('polaroid')) {
            if (!initialRenderComplete) return;

            newPhotosCount++;
            
            if (newPhotosCount <= 5) {
              node.classList.add('new-photo-entrance');
              node.addEventListener('animationend', () => {
                node.classList.remove('new-photo-entrance');
              }, { once: true });
            }
          }
        });
      }
    });

    if (!initialRenderComplete) {
      initialRenderComplete = true;
    }
  });

  observer.observe(galleryGrid, { childList: true, subtree: false });
});
  // 3. Etapa 3: Volteo 3D en el Lightbox
  if (galleryGrid) {
    galleryGrid.addEventListener('click', (e) => {
      const img = e.target.closest('.polaroid__img');
      if (!img) return; // Si clickean like o borrar, se ignora aquí y en app.js
      
      const card = img.closest('.polaroid');
      const nameEl = card?.querySelector('.polaroid__name');
      const msgEl  = card?.querySelector('.polaroid__message');

      const backName = document.getElementById('lightbox-back-name');
      const backMsg = document.getElementById('lightbox-back-message');
      
      if (backName) backName.textContent = nameEl ? nameEl.textContent : '';
      if (backMsg) backMsg.textContent = msgEl ? msgEl.textContent : 'Sin dedicatoria';

      const flipInner = document.getElementById('lightbox-flip-inner');
      if (flipInner) flipInner.classList.remove('is-flipped');
    });
  }

  // Activar volteo con botón
  document.addEventListener('click', (e) => {
    const flipBtn = e.target.closest('.lightbox__btn-flip');
    if (flipBtn) {
      const flipInner = document.getElementById('lightbox-flip-inner');
      if (flipInner) flipInner.classList.toggle('is-flipped');
    }
  });

  // Activar volteo con tecla (Espacio o 'F')
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && !lightbox.hidden && (e.key === 'f' || e.key === 'F' || e.key === ' ')) {
       e.preventDefault();
       const flipInner = document.getElementById('lightbox-flip-inner');
       if (flipInner) flipInner.classList.toggle('is-flipped');
    }
  });