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
    showToast('¡Tu recuerdo se agregó al álbum! 🤎', 'success', 5000);
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
//  PDF DOWNLOAD — html2pdf.js
// ═══════════════════════════════════════════════════════════
$downloadPdf.addEventListener('click', () => {
  if (typeof html2pdf === 'undefined') {
    showToast('La librería de PDF no se pudo cargar. Revisa tu conexión.', 'error');
    return;
  }

  if (!$galleryGrid.children.length || $galleryGrid.querySelector('.gallery__empty')) {
    showToast('La galería está vacía. ¡Agrega fotos antes de descargar!', 'info');
    return;
  }

  const pdfToast = showToast('Generando tu álbum en PDF…', 'info', 0);

  // Seleccionamos directamente el grid que envuelve todas las fotos
  const elemento = $galleryGrid;

  const opt = {
    margin:       10,
    filename:     'nuestro-album.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  setTimeout(() => {
    html2pdf().set(opt).from(elemento).save()
      .then(() => {
        dismissToast(pdfToast);
        showToast('¡Álbum descargado! 📄', 'success', 4000);
      })
      .catch((err) => {
        console.error('Error generando PDF:', err);
        dismissToast(pdfToast);
        showToast('Error al generar el PDF. Inténtalo de nuevo.', 'error');
      });
  }, 800);
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
