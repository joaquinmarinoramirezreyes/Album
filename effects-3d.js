/**
 * effects-3d.js
 * Lógica aislada para efectos 3D avanzados (Radial Glow y Animación de Entrada en Tiempo Real)
 * Activo solo en dispositivos de alto rendimiento (sin prefers-reduced-motion y con hover)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Comprobar preferencias del sistema y capacidades del dispositivo
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (prefersReducedMotion || !isPointerFine) {
    return; // No cargar efectos costosos
  }

  const galleryGrid = document.getElementById('gallery-grid');
  
  if (!galleryGrid) return;

  // 1. Brillo Radial (Radial Glow Tracker)
  // Utiliza delegación de eventos para manejar tarjetas generadas dinámicamente
  galleryGrid.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.polaroid, .single-card');
    if (!card) return;

    // Asegurar que la tarjeta tiene su overlay
    let overlay = card.querySelector('.glow-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'glow-overlay';
      card.appendChild(overlay);
    }

    // Calcular posición del ratón relativa a la tarjeta
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty('--mouse-x', x + 'px');
    card.style.setProperty('--mouse-y', y + 'px');
  });

  // 2. Detección de Fotos Nuevas en Tiempo Real (MutationObserver)
  // Detecta cuando Firebase / app.js inyecta una nueva tarjeta en la galería
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains('polaroid')) {
          // Aplicar clase para animación de entrada "desde el fondo hacia adelante"
          // La animación estará definida en la Etapa 2 de effects-3d.css
          node.classList.add('new-photo-entrance');
          
          // Eliminar la clase una vez terminada la animación para no interferir con el hover
          node.addEventListener('animationend', () => {
            node.classList.remove('new-photo-entrance');
          }, { once: true });
        }
      });
    });
  });

  observer.observe(galleryGrid, { childList: true });
});
