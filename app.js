/* ═══════════════════════════════════════════════════════════
   NUESTRO ÁLBUM DE BARRO — App Logic + Firebase + ImgBB + Toasts
   Firebase Firestore (datos) + ImgBB (imágenes) — 100% gratuito
   ═══════════════════════════════════════════════════════════ */

// ─── Firebase SDK Imports (CDN ESM) — Solo Firestore, sin Storage ───
import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';


// ═══════════════════════════════════════════════════════════
//  FIREBASE CONFIG
// ═══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            'AIzaSyBmVZDxge4Qq4HdkM0xQdPcqh_SKesph2s',
  authDomain:        'album-fotos-80c88.firebaseapp.com',
  projectId:         'album-fotos-80c88',
  storageBucket:     'album-fotos-80c88.firebasestorage.app',
  messagingSenderId: '888877871276',
  appId:             '1:888877871276:web:48978e68be84a69d31ef09'
};

// ─── Init Firebase (solo Firestore) ───
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);


// ═══════════════════════════════════════════════════════════
//  IMGBB CONFIG — Hosting gratuito de imágenes
//  Obtén tu API key en: https://api.imgbb.com/
// ═══════════════════════════════════════════════════════════
const IMGBB_API_KEY = '349a78e237c6ce840d9f9356b4a32ae6';


// ═══════════════════════════════════════════════════════════
//  IMAGE COMPRESSION CONFIG
// ═══════════════════════════════════════════════════════════
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,              // Máximo 500 KB
  maxWidthOrHeight: 1000,      // Máximo 1000px de ancho o alto
  useWebWorker: true,          // Usar Web Worker para no bloquear el hilo principal
  fileType: 'image/jpeg',      // Convertir a JPEG para mejor compresión
  initialQuality: 0.85,        // Calidad inicial
};


// ═══════════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════════

/** ID del evento actual — se establece al pasar el login */
let currentEventId = null;

/**
 * Referencia a la subcolección de entries del evento.
 * Estructura: events/{eventId}/guest_entries
 */
function getEntriesRef() {
  return collection(db, 'events', currentEventId, 'guest_entries');
}

/** Guarda el unsubscribe del listener para limpieza */
let unsubscribeGallery = null;


// ═══════════════════════════════════════════════════════════
//  DOM REFERENCES
// ═══════════════════════════════════════════════════════════
const $loginScreen   = document.getElementById('screen-login');
const $albumScreen   = document.getElementById('screen-album');
const $loginForm     = document.getElementById('login-form');
const $accessCode    = document.getElementById('access-code');
const $loginHint     = document.getElementById('login-hint');

const $uploadForm    = document.getElementById('upload-form');
const $photoInput    = document.getElementById('photo-input');
const $photoBtn      = document.getElementById('photo-btn');
const $photoPreview  = document.getElementById('photo-preview');
const $previewImg    = document.getElementById('preview-img');
const $previewRemove = document.getElementById('preview-remove');
const $uploadSubmit  = document.getElementById('upload-submit');
const $galleryGrid   = document.getElementById('gallery-grid');
const $downloadPdf   = document.getElementById('download-pdf');
const $toastContainer = document.getElementById('toast-container');
// ═══════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Muestra una notificación toast.
 * @param {string} message   — Texto del mensaje
 * @param {'info'|'success'|'error'} type — Tipo de toast
 * @param {number} duration  — Milisegundos antes de auto-cerrar (0 = manual)
 * @returns {HTMLElement}     — Referencia al elemento toast (para dismiss manual)
 */
function showToast(message, type = 'info', duration = 4000) {
  const icons = {
    info:    '🏺',
    success: '✅',
    error:   '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');

  if (duration > 0) {
    toast.style.setProperty('--toast-duration', `${duration}ms`);
  }

  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${icons[type]}</span>
    <span class="toast__text">${escapeHTML(message)}</span>
    <button class="toast__close" aria-label="Cerrar notificación">✕</button>
    ${duration > 0 ? '<div class="toast__progress"></div>' : ''}
  `;

  // Close button
  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  // Auto-dismiss
  let timer = null;
  if (duration > 0) {
    timer = setTimeout(() => dismissToast(toast), duration);
  }

  // Pause progress bar on hover
  toast.addEventListener('mouseenter', () => {
    if (timer) clearTimeout(timer);
    const bar = toast.querySelector('.toast__progress');
    if (bar) bar.style.animationPlayState = 'paused';
  });

  toast.addEventListener('mouseleave', () => {
    const bar = toast.querySelector('.toast__progress');
    if (bar) bar.style.animationPlayState = 'running';
    if (duration > 0) {
      timer = setTimeout(() => dismissToast(toast), 2000);
    }
  });

  $toastContainer.appendChild(toast);

  // Limit to 3 visible toasts max
  while ($toastContainer.children.length > 3) {
    dismissToast($toastContainer.firstElementChild);
  }

  return toast;
}

/**
 * Cierra un toast con animación de salida.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.classList.add('toast--leaving');
  toast.addEventListener('animationend', () => {
    toast.remove();
  }, { once: true });
}

/**
 * Actualiza el texto de un toast existente (útil para pasos progresivos).
 * @param {HTMLElement} toast
 * @param {string} message
 */
function updateToast(toast, message) {
  if (!toast) return;
  const textEl = toast.querySelector('.toast__text');
  if (textEl) textEl.textContent = message;
}


// ═══════════════════════════════════════════════════════════
//  PANTALLA A — LOGIN
// ═══════════════════════════════════════════════════════════
$loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = $accessCode.value.toUpperCase().trim();
  if (!code) return;

  const btnSubmit = $loginForm.querySelector('.login__btn');
  const originalText = btnSubmit.textContent;
  
  try {
    btnSubmit.textContent = 'Verificando...';
    btnSubmit.disabled = true;

    // Verificar en Firestore si el evento existe en 'eventos_activos'
    const eventRef = doc(db, 'eventos_activos', code);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      // Establecer el evento activo
      currentEventId = code;

      // Transición → Pantalla B
      transitionScreens($loginScreen, $albumScreen);

      // Arrancar el listener de la galería en tiempo real
      startGalleryListener();
    } else {
      // Error — shake + hint + toast
      showToast('Código de evento no válido o inactivo', 'error', 4000);
      triggerLoginError();
    }
  } catch (err) {
    console.error('Error al validar el evento:', err);
    showToast('Error al conectar con la base de datos', 'error', 4000);
    triggerLoginError();
  } finally {
    btnSubmit.textContent = originalText;
    btnSubmit.disabled = false;
  }
});

function triggerLoginError() {
  $accessCode.classList.add('login__input--error');
  $loginHint.hidden = false;

  $accessCode.addEventListener('animationend', () => {
    $accessCode.classList.remove('login__input--error');
  }, { once: true });
}

// Limpiar error al escribir
$accessCode.addEventListener('input', () => {
  $loginHint.hidden = true;
  $accessCode.classList.remove('login__input--error');
});


// ═══════════════════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════════════
function transitionScreens($from, $to) {
  $from.classList.add('screen--fading');

  $from.addEventListener('transitionend', () => {
    $from.classList.remove('screen--active', 'screen--fading');

    $to.classList.add('screen--active');
    // Force reflow → trigger CSS opacity transition
    void $to.offsetHeight;
    $to.style.opacity = '1';

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, { once: true });
}


// ═══════════════════════════════════════════════════════════
//  PHOTO PREVIEW
// ═══════════════════════════════════════════════════════════
$photoBtn.addEventListener('click', () => $photoInput.click());

$photoInput.addEventListener('change', () => {
  const file = $photoInput.files[0];
  if (!file) return;

  // Validar que sea una imagen
  if (!file.type.startsWith('image/')) {
    showToast('Por favor selecciona un archivo de imagen.', 'error');
    $photoInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    $previewImg.src = e.target.result;
    $photoPreview.hidden = false;
    $photoBtn.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

$previewRemove.addEventListener('click', () => {
  $photoInput.value = '';
  $previewImg.src = '';
  $photoPreview.hidden = true;
  $photoBtn.style.display = '';
});


// ═══════════════════════════════════════════════════════════
//  IMAGE COMPRESSION
// ═══════════════════════════════════════════════════════════

/**
 * Comprime una imagen en el cliente antes de subirla.
 * @param {File} file — Archivo de imagen original
 * @returns {Promise<File>} — Archivo comprimido
 */
async function compressImage(file) {
  // Si browser-image-compression no cargó, devolver el original
  if (typeof imageCompression === 'undefined') {
    console.warn('browser-image-compression no disponible, subiendo imagen original.');
    return file;
  }

  const originalSizeKB = (file.size / 1024).toFixed(0);

  // Si ya es menor a 500KB, no comprimir
  if (file.size <= COMPRESSION_OPTIONS.maxSizeMB * 1024 * 1024) {
    console.log(`Imagen ya optimizada (${originalSizeKB} KB), omitiendo compresión.`);
    return file;
  }

  console.log(`Comprimiendo imagen: ${originalSizeKB} KB...`);

  const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
  const compressedSizeKB = (compressedFile.size / 1024).toFixed(0);

  console.log(`Compresión completada: ${originalSizeKB} KB → ${compressedSizeKB} KB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reducción)`);

  return compressedFile;
}


// ═══════════════════════════════════════════════════════════
//  IMGBB UPLOAD
// ═══════════════════════════════════════════════════════════

/**
 * Convierte un File/Blob a base64 puro (sin prefijo data:...).
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]); // quitar prefijo
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen a ImgBB y devuelve la URL pública.
 * @param {File|Blob} file — Archivo de imagen (ya comprimido)
 * @param {string} name    — Nombre para la imagen
 * @returns {Promise<string>} — URL directa de la imagen
 */
async function uploadToImgBB(file, name) {
  if (!IMGBB_API_KEY) {
    throw new Error('Falta la API Key de ImgBB. Agrégala en app.js (línea IMGBB_API_KEY).');
  }

  const base64 = await fileToBase64(file);

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64);
  formData.append('name', `${name}_${Date.now()}`);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ImgBB error (${response.status}): ${errText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(`ImgBB rechazó la imagen: ${JSON.stringify(result.error)}`);
  }

  // result.data.display_url = URL directa a la imagen
  return result.data.display_url;
}


// ═══════════════════════════════════════════════════════════
//  UPLOAD FORM — Submit → Compress → ImgBB → Firestore
// ═══════════════════════════════════════════════════════════
$uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('guest-name').value.trim();
  const message = document.getElementById('guest-message').value.trim();
  const file    = $photoInput.files[0];

  // ── Validación básica ──
  if (!name) {
    showToast('Escribe tu nombre para continuar.', 'error', 3000);
    document.getElementById('guest-name').focus();
    return;
  }
  if (!file) {
    showToast('Selecciona una foto para agregar al álbum.', 'error', 3000);
    $photoBtn.focus();
    return;
  }

  setSubmitLoading(true);

  // Toast de progreso (sin auto-dismiss, lo controlamos manualmente)
  const progressToast = showToast('Preparando foto…', 'info', 0);

  try {
    // 1️⃣  Comprimir imagen en el cliente
    const compressedFile = await compressImage(file);

    // 2️⃣  Subir imagen comprimida a ImgBB (hosting gratuito)
    updateToast(progressToast, 'Subiendo foto al álbum…');
    const imageUrl = await uploadToImgBB(compressedFile, name);

    // 3️⃣  Guardar entrada en Firestore
    updateToast(progressToast, 'Guardando tu dedicatoria…');
    await addDoc(getEntriesRef(), {
      nombre:      name,
      dedicatoria: message,
      imageUrl:    imageUrl,
      timestamp:   serverTimestamp()
    });

    // ✅ Éxito
    dismissToast(progressToast);
    showToast('¡Tu recuerdo se agregó al álbum! 💙', 'success', 5000);
    resetForm();

  } catch (err) {
    console.error('Error al subir la entrada:', err);
    dismissToast(progressToast);
    showToast(
      `Error al subir tu foto: ${err.message || 'Revisa tu conexión.'}`,
      'error',
      7000
    );
  } finally {
    setSubmitLoading(false);
  }
});


function setSubmitLoading(isLoading) {
  const $spinner = $uploadSubmit.querySelector('.btn__spinner');

  if (isLoading) {
    $uploadSubmit.classList.add('btn--loading');
    $uploadSubmit.disabled = true;
    $spinner.hidden = false;
  } else {
    $uploadSubmit.classList.remove('btn--loading');
    $uploadSubmit.disabled = false;
    $spinner.hidden = true;
  }
}


function resetForm() {
  $uploadForm.reset();
  $previewImg.src = '';
  $photoPreview.hidden = true;
  $photoBtn.style.display = '';
}


// ═══════════════════════════════════════════════════════════
//  GALLERY — Real-time Firestore Listener (onSnapshot)
// ═══════════════════════════════════════════════════════════

function startGalleryListener() {
  // Desuscribir listener previo si existe (cambio de evento)
  if (unsubscribeGallery) {
    unsubscribeGallery();
  }

  // Query: ordenar por timestamp descendente (más recientes primero)
  const q = query(
    getEntriesRef(),
    orderBy('timestamp', 'desc')
  );

  unsubscribeGallery = onSnapshot(q, (snapshot) => {
    // Limpiar galería completa y reconstruir
    $galleryGrid.innerHTML = '';

    if (snapshot.empty) {
      $galleryGrid.innerHTML = `
        <p class="gallery__empty" style="
          grid-column: 1 / -1;
          text-align: center;
          color: var(--color-charcoal-light);
          font-style: italic;
          padding: var(--sp-8) var(--sp-4);
        ">
          Aún no hay fotos. ¡Sé el primero en agregar una! 📷
        </p>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      renderPolaroidCard(data);
    });
  }, (error) => {
    console.error('Error en el listener de la galería:', error);
    showToast('Error al cargar la galería. Recarga la página.', 'error', 6000);
  });
}


/**
 * Crea e inserta una tarjeta Polaroid en la galería.
 * @param {{ nombre: string, dedicatoria: string, imageUrl: string }} data
 */
function renderPolaroidCard(data) {
  const card = document.createElement('article');
  card.className = 'polaroid';

  card.innerHTML = `
    <div class="polaroid__img-wrapper">
      <img
        class="polaroid__img"
        src="${escapeAttr(data.imageUrl)}"
        alt="Foto de ${escapeHTML(data.nombre)}"
        crossorigin="anonymous"
      >
    </div>
    <div class="polaroid__caption">
      <strong class="polaroid__name">${escapeHTML(data.nombre)}</strong>
      ${data.dedicatoria
        ? `<em class="polaroid__message">${escapeHTML(data.dedicatoria)}</em>`
        : ''
      }
    </div>
  `;

  $galleryGrid.appendChild(card);
}


// ═══════════════════════════════════════════════════════════
//  LIGHTBOX — Click en foto para verla en grande
// ═══════════════════════════════════════════════════════════
const $lightbox      = document.getElementById('lightbox');
const $lightboxImg   = document.getElementById('lightbox-img');
const $lightboxCaption = document.getElementById('lightbox-caption');
const $lightboxClose = document.getElementById('lightbox-close');

// Delegación de eventos: click en cualquier imagen de la galería
$galleryGrid.addEventListener('click', (e) => {
  const img = e.target.closest('.polaroid__img');
  if (!img) return;

  const card = img.closest('.polaroid');
  const nameEl = card?.querySelector('.polaroid__name');
  const msgEl  = card?.querySelector('.polaroid__message');

  $lightboxImg.src = img.src;
  $lightboxCaption.textContent = nameEl ? nameEl.textContent : '';
  $lightbox.hidden = false;
  document.body.style.overflow = 'hidden'; // Bloquear scroll
});

function closeLightbox() {
  $lightbox.hidden = true;
  $lightboxImg.src = '';
  document.body.style.overflow = '';
}

$lightboxClose.addEventListener('click', closeLightbox);

// Cerrar al hacer click en el fondo oscuro (no en la imagen)
$lightbox.addEventListener('click', (e) => {
  if (e.target === $lightbox) closeLightbox();
});

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$lightbox.hidden) closeLightbox();
});


// ═══════════════════════════════════════════════════════════
//  PDF DOWNLOAD — jsPDF directo (sin html2canvas)
// ═══════════════════════════════════════════════════════════

/**
 * Carga una imagen y devuelve su base64 via canvas.
 * Cache-bust + crossOrigin fuerzan recarga limpia con CORS.
 */
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

$downloadPdf.addEventListener('click', async () => {
  if (typeof window.jspdf === 'undefined') {
    showToast('La librería de PDF no se pudo cargar. Revisa tu conexión.', 'error');
    return;
  }

  const cards = $galleryGrid.querySelectorAll('.polaroid');
  if (!cards.length || $galleryGrid.querySelector('.gallery__empty')) {
    showToast('La galería está vacía. ¡Agrega fotos antes de descargar!', 'info');
    return;
  }

  const pdfToast = showToast('Preparando imágenes para el PDF…', 'info', 0);
  $downloadPdf.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210, H = 297; // A4

    // ══════════════════════════════════
    //  PORTADA
    // ══════════════════════════════════
    doc.setFillColor(30, 56, 136); // #1E3888
    doc.rect(0, 0, W, H, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('Nuestro Album de Barro', W / 2, H / 2 - 20, { align: 'center' });

    // Línea decorativa
    doc.setDrawColor(255, 255, 255, 120);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 25, H / 2, W / 2 + 25, H / 2);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.text('Recuerdos moldeados con amor', W / 2, H / 2 + 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(200, 210, 230);
    doc.text(`${cards.length} ${cards.length === 1 ? 'recuerdo' : 'recuerdos'} en este album`, W / 2, H / 2 + 30, { align: 'center' });

    // ══════════════════════════════════
    //  CARGAR IMÁGENES
    // ══════════════════════════════════
    updateToast(pdfToast, 'Convirtiendo imágenes…');

    const entries = [];
    for (const card of cards) {
      const img = card.querySelector('.polaroid__img');
      const nameEl = card.querySelector('.polaroid__name');
      const msgEl = card.querySelector('.polaroid__message');

      let b64 = null;
      if (img && img.src) {
        b64 = await loadImageAsBase64(img.src);
      }

      entries.push({
        nombre: nameEl ? nameEl.textContent.trim() : '',
        dedicatoria: msgEl ? msgEl.textContent.trim() : '',
        imgData: b64,
      });
    }

    // ══════════════════════════════════
    //  CUADRÍCULA 3 COLUMNAS
    // ══════════════════════════════════
    updateToast(pdfToast, 'Generando tu álbum en PDF…');

    const MARGIN = 12;
    const GAP = 8;
    const COLS = 3;
    const colW = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS; // ~58mm
    const imgH = colW;  // Cuadrada
    const textH = 18;   // Espacio para texto
    const cardH = imgH + textH;
    const ROWS_PER_PAGE = Math.floor((H - MARGIN * 2) / (cardH + GAP)); // ~3 filas

    let cardIndex = 0;

    while (cardIndex < entries.length) {
      doc.addPage();

      // Encabezado sutil de la página
      doc.setFillColor(30, 56, 136);
      doc.rect(0, 0, W, 6, 'F');

      for (let row = 0; row < ROWS_PER_PAGE && cardIndex < entries.length; row++) {
        for (let col = 0; col < COLS && cardIndex < entries.length; col++) {
          const entry = entries[cardIndex];
          const x = MARGIN + col * (colW + GAP);
          const y = MARGIN + 8 + row * (cardH + GAP);

          // Fondo de tarjeta
          doc.setFillColor(250, 250, 250);
          doc.setDrawColor(220, 225, 235);
          doc.roundedRect(x, y, colW, cardH, 2, 2, 'FD');

          // Imagen
          if (entry.imgData) {
            try {
              doc.addImage(entry.imgData, 'JPEG', x + 1, y + 1, colW - 2, imgH - 2);
            } catch (e) {
              // Si falla, dibujar placeholder gris
              doc.setFillColor(234, 240, 246);
              doc.rect(x + 1, y + 1, colW - 2, imgH - 2, 'F');
              doc.setTextColor(130, 140, 160);
              doc.setFontSize(7);
              doc.text('Sin imagen', x + colW / 2, y + imgH / 2, { align: 'center' });
            }
          } else {
            doc.setFillColor(234, 240, 246);
            doc.rect(x + 1, y + 1, colW - 2, imgH - 2, 'F');
            doc.setTextColor(130, 140, 160);
            doc.setFontSize(7);
            doc.text('Sin imagen', x + colW / 2, y + imgH / 2, { align: 'center' });
          }

          // Línea azul decorativa
          doc.setFillColor(30, 56, 136);
          doc.rect(x, y + imgH, colW, 1.5, 'F');

          // Nombre
          doc.setTextColor(28, 35, 49);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const maxTextW = colW - 4;
          const nombreCorto = doc.splitTextToSize(entry.nombre, maxTextW)[0] || '';
          doc.text(nombreCorto, x + 2, y + imgH + 6);

          // Dedicatoria
          if (entry.dedicatoria) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(82, 94, 117);
            const lines = doc.splitTextToSize(`"${entry.dedicatoria}"`, maxTextW);
            doc.text(lines.slice(0, 2), x + 2, y + imgH + 11);
          }

          cardIndex++;
        }
      }
    }

    // ══════════════════════════════════
    //  PIE DE PÁGINA
    // ══════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(160, 170, 185);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nuestro Album de Barro — pag. ${p - 1}`, W / 2, H - 6, { align: 'center' });
    }

    // ══════════════════════════════════
    //  GUARDAR
    // ══════════════════════════════════
    doc.save('nuestro-album-de-barro.pdf');

    dismissToast(pdfToast);
    showToast('¡Álbum descargado! 📄', 'success', 4000);

  } catch (err) {
    console.error('Error generando PDF:', err);
    dismissToast(pdfToast);
    showToast('Error al generar el PDF. Inténtalo de nuevo.', 'error', 5000);
  } finally {
    $downloadPdf.disabled = false;
  }
});


// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════

/** Escapa HTML para contenido de texto */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/** Escapa para atributos HTML (comillas, etc.) */
function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML.replace(/"/g, '&quot;');
}
