/**
 * effects-3d.js
 * Lógica aislada para efectos 3D avanzados
 */

// Como esto se carga como <script type="module">, el DOM ya está listo (defer).
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const galleryGrid = document.getElementById('gallery-grid');

if (!prefersReducedMotion && isPointerFine && galleryGrid) {
  // 1. Brillo Radial (Radial Glow Tracker)
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

  // 2. Detección de Fotos Nuevas en Tiempo Real (Etapa 2)
  let globalGalleryDocs = [];
  let initialRenderComplete = false;
  window.addEventListener('gallery-update', (e) => {
    globalGalleryDocs = e.detail.docs;
    if (!e.detail.fromCache) {
      initialRenderComplete = true; // Servidor sincronizado
    }
  });

  const observer = new MutationObserver((mutations) => {
    let newPhotosCount = 0;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('polaroid')) {
            if (!initialRenderComplete) return; // Ignorar hasta sincronizar servidor

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
  });

  observer.observe(galleryGrid, { childList: true, subtree: false });
}

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
    if (flipInner) {
      flipInner.classList.remove('is-flipped');
      const front = flipInner.querySelector('.lightbox__flip-front');
      const back = flipInner.querySelector('.lightbox__flip-back');
      if (front) { front.removeAttribute('inert'); }
      if (back) { back.setAttribute('inert', ''); }
    }
    const flipBtn = document.getElementById('lightbox-btn-flip');
    if (flipBtn) {
        flipBtn.setAttribute('aria-label', 'Ver dedicatoria');
        flipBtn.classList.remove('is-flipped-state');
    }
  });
}

function handleLightboxFlip() {
  const flipInner = document.getElementById('lightbox-flip-inner');
  const flipBtn = document.getElementById('lightbox-btn-flip');
  if (flipInner) {
    const isFlipped = flipInner.classList.toggle('is-flipped');
    
    if (flipBtn) {
        if (isFlipped) {
            flipBtn.setAttribute('aria-label', 'Volver a la foto');
            flipBtn.classList.add('is-flipped-state');
        } else {
            flipBtn.setAttribute('aria-label', 'Ver dedicatoria');
            flipBtn.classList.remove('is-flipped-state');
        }
        flipBtn.focus();
    }

    const front = flipInner.querySelector('.lightbox__flip-front');
    const back = flipInner.querySelector('.lightbox__flip-back');
    if (front) {
        if (isFlipped) front.setAttribute('inert', ''); else front.removeAttribute('inert');
    }
    if (back) {
        if (isFlipped) back.removeAttribute('inert'); else back.setAttribute('inert', '');
    }
  }
}

// Activar volteo con botón
document.addEventListener('click', (e) => {
  const flipBtn = e.target.closest('.lightbox__btn-flip');
  if (flipBtn) {
    handleLightboxFlip();
  }
});

// Activar volteo con tecla (Espacio o 'F')
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox && !lightbox.hidden && (e.key === 'f' || e.key === 'F' || e.key === ' ')) {
      e.preventDefault();
      handleLightboxFlip();
  }
});

// =========================================================
// ETAPA 4: COVERFLOW (SLIDESHOW 3D)
// =========================================================
const coverflowModal = document.getElementById('coverflow');
const coverflowContainer = document.getElementById('coverflow-container');
const coverflowClose = document.getElementById('coverflow-close');

let coverflowActive = false;
let coverflowCards = []; // Datos de las tarjetas
let coverflowIndex = 0;
let coverflowInterval = null;
let wakeLock = null;

// Real-time queue
let coverflowQueue = [];
let isProcessingQueue = false;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
  }
}
function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => wakeLock = null).catch(()=>{});
  }
}

document.addEventListener('visibilitychange', () => {
  if (coverflowActive && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

window.addEventListener('open-coverflow', async () => {
  try {
    const domCards = document.querySelectorAll('.polaroid');
    if (domCards.length === 0) throw new Error("No cards");

    // 1. Fullscreen y WakeLock
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}
    requestWakeLock();

    // 2. Extraer datos actuales de la cuadrícula
    coverflowCards = Array.from(domCards).map(card => {
      return {
        src: card.querySelector('.polaroid__img').src,
        name: card.querySelector('.polaroid__name').textContent,
        msg: card.querySelector('.polaroid__message')?.textContent || ''
      };
    });

    coverflowIndex = 0;
    coverflowActive = true;
    coverflowQueue = [];
    isProcessingQueue = false;
    window.dispatchEvent(new CustomEvent('coverflow-received'));
    
    coverflowModal.hidden = false;
    
    try {
      renderCoverflow();
      startCoverflowTimer();
    } catch(renderError) {
      throw renderError;
    }
  } catch(e) {
    window.dispatchEvent(new CustomEvent('coverflow-failed'));
  }
});

if (coverflowClose) {
  coverflowClose.addEventListener('click', () => {
    coverflowActive = false;
    coverflowModal.hidden = true;
    clearInterval(coverflowInterval);
    releaseWakeLock();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(()=>{});
    }
  });
}

function renderCoverflow(overrideIndex = null) {
  if (!coverflowActive || coverflowCards.length === 0) return;
  
  if (overrideIndex !== null) {
    coverflowIndex = overrideIndex;
  } else {
    coverflowIndex = (coverflowIndex + 1) % coverflowCards.length;
  }

  // Virtualización: Renderizamos solo 5 elementos
  coverflowContainer.innerHTML = '';
  
  for (let offset = -2; offset <= 2; offset++) {
    let idx = (coverflowIndex + offset) % coverflowCards.length;
    if (idx < 0) idx += coverflowCards.length;

    const data = coverflowCards[idx];
    const cardEl = document.createElement('div');
    cardEl.className = 'coverflow-card';
    
    if (offset === 0) cardEl.classList.add('center');
    else if (offset === -1) cardEl.classList.add('left-1');
    else if (offset === 1) cardEl.classList.add('right-1');
    else if (offset === -2) cardEl.classList.add('left-2');
    else if (offset === 2) cardEl.classList.add('right-2');
    else cardEl.classList.add('hidden');

    cardEl.innerHTML = '<img src="' + data.src + '" alt="Foto"><div class="coverflow-caption"><strong>' + data.name + '</strong><br><span>' + data.msg + '</span></div>';

    coverflowContainer.appendChild(cardEl);
  }
}

function startCoverflowTimer() {
  clearInterval(coverflowInterval);
  coverflowInterval = setInterval(() => {
    if (!isProcessingQueue) {
      renderCoverflow();
    }
  }, 4500);
}

function processCoverflowQueue() {
  if (coverflowQueue.length === 0) {
    isProcessingQueue = false;
    startCoverflowTimer();
    return;
  }
  
  isProcessingQueue = true;
  const newData = coverflowQueue.shift();
  coverflowCards.push(newData);
  renderCoverflow(coverflowCards.length - 1);
  
  setTimeout(() => {
    processCoverflowQueue();
  }, 3500); // Se muestra por 3.5 segundos en el centro
}

window.addEventListener('coverflow-realtime-add', (e) => {
  if (!coverflowActive || !initialRenderComplete) return;
  
  const newData = e.detail;
  
  if (coverflowQueue.length >= 5) {
    coverflowCards.push(newData);
    return;
  }
  
  coverflowQueue.push(newData);
  if (!isProcessingQueue) {
    processCoverflowQueue();
  }
});

// --- ETAPA 5: PARALLAX LOGIN ---
const loginScreen = document.getElementById('screen-login');
if (loginScreen && !prefersReducedMotion && isPointerFine) {
  loginScreen.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * -40;
    const y = (e.clientY / window.innerHeight - 0.5) * -40;
    document.body.style.setProperty('background-position', `calc(50% + ${x}px) calc(50% + ${y}px)`, 'important');
  });
  
  loginScreen.addEventListener('mouseleave', () => {
    document.body.style.setProperty('background-position', 'center', 'important');
  });
}