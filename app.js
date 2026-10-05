const THEMES = {
  default: {
    name: 'Nuestro Álbum',
    bgImage: '/assets/talavera-pattern.jpg',
    colorBg: '#FAFAFA', colorBgWarm: '#EAF0F6',
    colorTalavera: '#1E3888', colorTalaveraDark: '#12245C',
    colorTerracotta: '#C46D5E', overlay: '234, 240, 246',
    charcoal: '#1C2331', charcoalLight: '#525E75', divider: '#DFE4EC'
  },
  marli: {
    name: 'Marli Cerámica',
    bgImage: '/assets/talavera-pattern.jpg',
    colorBg: '#FAFAFA', colorBgWarm: '#EAF0F6',
    colorTalavera: '#1E3888', colorTalaveraDark: '#12245C',
    colorTerracotta: '#C46D5E', overlay: '234, 240, 246',
    charcoal: '#1C2331', charcoalLight: '#525E75', divider: '#DFE4EC'
  },
  shots: {
    name: 'Cerámica Shots',
    bgImage: '/assets/shots-pattern.jpg',
    colorBg: '#FBF5EE', colorBgWarm: '#F6E7D8',
    colorTalavera: '#C0582F', colorTalaveraDark: '#9A4322',
    colorTerracotta: '#2F4F8F', overlay: '251, 241, 230',
    charcoal: '#3A2418', charcoalLight: '#7A5A48', divider: '#EAD6C3'
  }
};

function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.marli;
  const r = document.documentElement.style;
  r.setProperty('--bg-pattern', "url('" + theme.bgImage + "')");
  r.setProperty('--color-bg', theme.colorBg);
  r.setProperty('--color-bg-warm', theme.colorBgWarm);
  r.setProperty('--color-talavera', theme.colorTalavera);
  r.setProperty('--color-talavera-dark', theme.colorTalaveraDark);
  r.setProperty('--color-terracotta', theme.colorTerracotta);
  r.setProperty('--overlay-rgb', theme.overlay);
  r.setProperty('--color-charcoal', theme.charcoal);
  r.setProperty('--color-charcoal-light', theme.charcoalLight);
  r.setProperty('--color-divider', theme.divider);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colorTalavera);
  document.title = theme.name;
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) heroTitle.textContent = theme.name;
  window.currentEventTheme = theme;
}
/* ═══════════════════════════════════════════════════════════
   NUESTRO ÁLBUM CERÁMICO — App Logic + Firebase + Toasts
   Firebase Firestore (datos + imágenes inline) — 100% gratuito
   ═══════════════════════════════════════════════════════════ */

// ─── Firebase SDK Imports (CDN ESM) — Solo Firestore, sin Storage ───
import { initializeApp }       from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore';

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

// Inicializar base de datos activando la persistencia offline (Caché)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// ═══════════════════════════════════════════════════════════
//  ALMACENAMIENTO DE IMÁGENES
// ═══════════════════════════════════════════════════════════
// Las imágenes se comprimen a ~13KB y se guardan como Data URL (base64)
// directamente en Firestore. Cero dependencias externas, cero APIs de terceros.

// ═══════════════════════════════════════════════════════════
//  IMAGE COMPRESSION CONFIG
// ═══════════════════════════════════════════════════════════
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3,              // Máximo 300 KB (muy ligero para celular)
  maxWidthOrHeight: 800,       // Máximo 800px (suficiente para pantalla y PDF)
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.7,         // Calidad más baja para ahorrar peso
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

// Admin DOM Refs
const $btnAdminModal = document.getElementById('btn-admin-modal');
const $btnHostModal  = document.getElementById('btn-host-modal');
const $modalAdminAuth = document.getElementById('modal-admin-auth');
const $modalHostAuth = document.getElementById('modal-host-auth');
const $formAdminAuth = document.getElementById('form-admin-auth');
const $formHostAuth  = document.getElementById('form-host-auth');
const $inputAdminPass = document.getElementById('input-admin-pass');
const $inputHostCode = document.getElementById('input-host-code');
const $inputHostPin  = document.getElementById('input-host-pin');
const $adminError    = document.getElementById('admin-error');
const $hostError     = document.getElementById('host-error');

const $modalAdminPanel = document.getElementById('modal-admin-panel');
const $formCreateEvent = document.getElementById('form-create-event');
const $inputNewEvent   = document.getElementById('input-new-event');
const $inputEventDate  = document.getElementById('input-event-date');
const $inputEventPin   = document.getElementById('input-event-pin');
const $adminEventList  = document.getElementById('admin-event-list');
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
    info:    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error:   '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');

  if (duration > 0) {
    toast.style.setProperty('--toast-duration', `${duration}ms`);
  }

  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true" style="display:flex; align-items:center; justify-content:center;">${icons[type]}</span>
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
//  INIT / LECTURA DE URL (PARA CÓDIGOS QR)
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  if (codeParam) {
    $accessCode.value = codeParam.toUpperCase();
    // Auto-enviar si se entra por QR
    $loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
  }
});

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

      // Aplicar tema dinámico
      applyTheme(eventSnap.data().theme || 'marli');

      // Transición → Pantalla B
      transitionScreens($loginScreen, $albumScreen);
      history.pushState({ screen: 'album' }, '', '#album');
      window.dispatchEvent(new CustomEvent('legacy:enter', { detail: { code, isHost: localStorage.getItem('host_' + code) === 'true' } }));

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
//  ADMIN: CREAR NUEVO EVENTO
// ═══════════════════════════════════════════════════════════
const ADMIN_PASSWORD = "ceramica"; // Contraseña simple para el modal

// Abrir modal de autenticación
$btnAdminModal.addEventListener('click', () => {
  $modalAdminAuth.hidden = false;
  $inputAdminPass.value = '';
  $adminError.hidden = true;
  $inputAdminPass.focus();
});

// Validar contraseña
$formAdminAuth.addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($inputAdminPass.value === ADMIN_PASSWORD) {
    $modalAdminAuth.hidden = true;
    $modalAdminPanel.hidden = false;
    $inputNewEvent.value = '';
    $inputNewEvent.focus();
    await loadAdminEvents();
  } else {
    $adminError.hidden = false;
  }
});

// Cargar y listar eventos en el modal
async function loadAdminEvents() {
  $adminEventList.innerHTML = '<li style="text-align:center; font-size: 0.8rem; color:#888;">Cargando eventos...</li>';
  try {
    const snapshot = await getDocs(collection(db, 'eventos_activos'));
    
    $adminEventList.innerHTML = '';
    
    if (snapshot.empty) {
      $adminEventList.innerHTML = '<li style="text-align:center; font-size: 0.8rem; color:#888;">No hay eventos activos.</li>';
      return;
    }

    // Ordenar localmente (los que no tengan creadoEn se van al fondo)
    const docsArray = snapshot.docs;
    docsArray.sort((a, b) => {
      const timeA = a.data().creadoEn?.toMillis() || 0;
      const timeB = b.data().creadoEn?.toMillis() || 0;
      return timeB - timeA;
    });

    docsArray.forEach(docSnap => {
      const code = docSnap.id;
      const li = document.createElement('li');
      const data = docSnap.data();
      let dateInfoHtml = '';
      
      if (data.fechaEvento) {
         // Calcular días usando zona horaria local para evitar saltos de día por UTC
         const [year, month, day] = data.fechaEvento.split('-');
         const eventDate = new Date(year, month - 1, day);
         const today = new Date();
         today.setHours(0,0,0,0);
         eventDate.setHours(0,0,0,0);
         
         const diffTime = today - eventDate;
         const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
         
         let daysText = '';
         let color = '#888';
         if (diffDays > 0) {
            daysText = `Terminó hace ${diffDays} día(s)`;
            if (diffDays > 15) color = '#d32f2f'; // Highlight old ones
         } else if (diffDays === 0) {
            daysText = 'Hoy es el evento';
            color = '#2e7d32';
         } else {
            daysText = `Faltan ${Math.abs(diffDays)} día(s)`;
         }
         dateInfoHtml = `<div style="font-size:0.75rem; color:${color}; margin-top:2px;">${data.fechaEvento} • ${daysText}</div>`;
      }

      const themeName = (THEMES[data.theme] || THEMES.marli).name;
      const pinHtml = data.adminPin
        ? `<span class="admin-chip admin-chip--pin" title="Clic para copiar" data-copy="${escapeAttr(data.adminPin)}">PIN ${escapeHTML(data.adminPin)}</span>`
        : '<span class="admin-chip" style="opacity:.6">Sin PIN</span>';
      li.innerHTML = `
        <div class="admin-ev">
          <span class="admin-ev__code">${escapeHTML(code)}</span>
          <div class="admin-ev__meta"><span class="admin-chip">${escapeHTML(themeName)}</span>${pinHtml}</div>
          ${dateInfoHtml}
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="qr-btn" aria-label="Código QR" title="Descargar QR" data-code="${escapeAttr(code)}" style="color:var(--color-talavera);">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 2h2v2H2V2Z"/><path d="M6 0v6H0V0h6ZM5 1H1v4h4V1ZM4 12H2v2h2v-2Z"/><path d="M6 10v6H0v-6h6Zm-5 1v4h4v-4H1Zm11-9h2v2h-2V2Z"/><path d="M10 0v6h6V0h-6Zm5 1v4h-4V1h4ZM8 1V0h1v2H8v2H7V1h1Zm0 5V4h1v2H8ZM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8H6Zm0 0v1H2V8H1v1H0V7h3v1h3Zm10 1h-1V7h1v2Zm-1 0h-1v2h2v-1h-1V9Zm-4 0h2v1h-1v1h-1V9Zm2 3v-1h-1v1h-1v1H9v1h3v-2h1Zm0 0h3v1h-2v1h-1v-2Zm-4-1v1h1v-2H7v1h2Z"/><path d="M7 12h1v3h4v1H7v-4Zm9 2v2h-3v-1h2v-1h1Z"/>
            </svg>
          </button>
          <button type="button" class="del-btn" aria-label="Eliminar evento" title="Borrar evento" data-code="${escapeAttr(code)}">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      `;
      // Event listener para borrar
      li.querySelector('.del-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const codeToDelete = btn.getAttribute('data-code');
        if (confirm(`¿Estás seguro de ELIMINAR COMPLETAMENTE el evento "${codeToDelete}"?\n\nSi aceptas, se borrará el acceso y TODAS las dedicatorias de la base de datos para liberar espacio en Firestore.`)) {
          try {
            btn.disabled = true;
            // 1. Obtener y borrar todas las fotos de Firestore (liberar espacio)
            const entriesSnap = await getDocs(collection(db, 'events', codeToDelete, 'guest_entries'));
            const deletePromises = entriesSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            
            // 2. Borrar el acceso
            await deleteDoc(doc(db, 'eventos_activos', codeToDelete));
            
            showToast(`Evento y fotos de ${codeToDelete} eliminados`, 'info');
            loadAdminEvents(); // Recargar la lista
          } catch (err) {
            console.error(err);
            showToast('Error al eliminar. Revisa permisos.', 'error');
            btn.disabled = false;
          }
        }
      });
      // Event listener para QR
      li.querySelector('.qr-btn').addEventListener('click', (e) => {
        const codeQR = e.currentTarget.getAttribute('data-code');
        const url = window.location.origin + window.location.pathname + "?code=" + encodeURIComponent(codeQR);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
        window.open(qrUrl, '_blank');
      });
      $adminEventList.appendChild(li);
    });

  } catch (error) {
    console.error('Error al cargar eventos:', error);
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      $adminEventList.innerHTML = `<li style="text-align:center; font-size: 0.75rem; color:#d32f2f;">Se requiere crear un índice en Firestore para ordenar por 'creadoEn'.</li>`;
    } else {
      $adminEventList.innerHTML = `<li style="text-align:center; font-size: 0.75rem; color:#d32f2f;">Error de permisos o red.</li>`;
    }
  }
}

// Crear Evento en Firestore
$formCreateEvent.addEventListener('submit', async (e) => {
  e.preventDefault();
  let code = $inputNewEvent.value.toUpperCase().trim().replace(/\s+/g, ''); // Sin espacios
  if (!code) return;

  const eventDate = $inputEventDate.value;
    const eventPin = $inputEventPin.value.trim();
  const eventTheme = (document.querySelector('input[name="event-theme"]:checked') || {}).value || 'marli';
  const btnSubmit = $formCreateEvent.querySelector('button[type="submit"]');
  const originalText = btnSubmit.textContent;
  
  try {
    btnSubmit.textContent = 'Creando...';
    btnSubmit.disabled = true;

    // Crear el documento en 'eventos_activos'
    const eventRef = doc(db, 'eventos_activos', code);
    await setDoc(eventRef, {
      creadoEn: serverTimestamp(),
      fechaEvento: eventDate,
        activo: true,
        adminPin: eventPin || null,
        theme: eventTheme
    });

    showToast(`¡Evento ${code} creado exitosamente!`, 'success', 5000);
    $inputNewEvent.value = '';
    $inputEventDate.value = '';
      $inputEventPin.value = '';
    
    // Recargar lista y auto-rellenar
    loadAdminEvents();
    $accessCode.value = code;
    
  } catch (err) {
    console.error('Error al crear evento:', err);
    showToast('Error al crear el evento. Revisa permisos en Firebase.', 'error', 5000);
  } finally {
    btnSubmit.textContent = originalText;
    btnSubmit.disabled = false;
  }
});


// ── Modo Anfitrión ──
// __hostLoginGuard: si entran por el login normal, se pierden los permisos de moderador
document.addEventListener('submit', (e) => {
  if (e.target && e.target.id === 'login-form') {
    if (!window.__hostLogin) {
      Object.keys(localStorage).filter(k => k.startsWith('host_')).forEach(k => localStorage.removeItem(k));
    }
    window.__hostLogin = false;
  }
}, true);
if ($btnHostModal) {
  $btnHostModal.addEventListener('click', () => {
    $modalHostAuth.hidden = false;
    $inputHostCode.focus();
  });
}
if ($modalHostAuth) {
  $modalHostAuth.querySelector('.modal-close').addEventListener('click', () => {
    $modalHostAuth.hidden = true;
  });
}
if ($formHostAuth) {
  $formHostAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeEvent = $inputHostCode.value.toUpperCase().trim().replace(/\s+/g, '');
    const pin = $inputHostPin.value.trim();
    const btnSubmit = $formHostAuth.querySelector('button[type="submit"]');
    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verificando...';
      $hostError.hidden = true;
      const eventSnap = await getDoc(doc(db, 'eventos_activos', codeEvent));
      if (eventSnap.exists() && eventSnap.data().adminPin && eventSnap.data().adminPin === pin) {
        localStorage.setItem('host_' + codeEvent, 'true');
        $modalHostAuth.hidden = true;
        $inputHostCode.value = '';
        $inputHostPin.value = '';
        const accessInput = document.getElementById('access-code');
        accessInput.value = codeEvent;
        window.__hostLogin = true;
        document.getElementById('login-form').requestSubmit();
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
}

// Cerrar modales (botones X)
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    $modalAdminAuth.hidden = true;
    $modalAdminPanel.hidden = true;
  });
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
// ── Flechas de navegación del navegador (atrás / adelante) ──
if (location.hash === '#album') history.replaceState(null, '', location.pathname);

window.addEventListener('popstate', () => {
  const albumActive = $albumScreen.classList.contains('screen--active');
  if (albumActive) {
    if (location.hash === '#album' || location.hash === '#singles') {
      window.dispatchEvent(new CustomEvent('legacy:tab', { detail: location.hash.replace('#', '') }));
      return;
    }
    document.querySelectorAll('.lightbox:not([hidden])').forEach(el => { el.hidden = true; });
    if (unsubscribeGallery) { unsubscribeGallery(); unsubscribeGallery = null; }
    currentEventId = null;
    window.dispatchEvent(new CustomEvent('legacy:exit'));
      applyTheme('default');
    transitionScreens($albumScreen, $loginScreen);
  } else if (history.state && history.state.screen === 'album') {
    history.replaceState(null, '', location.pathname);
  }
});

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

  // Aunque la imagen sea pequeña, debemos pasarla por el compresor
  // para forzar la conversión a JPEG, ya que ImgBB (Error 111) rechaza formatos nativos como WEBP/AVIF
  console.log(`Procesando imagen (Original: ${originalSizeKB} KB)...`);

  const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
  const compressedSizeKB = (compressedFile.size / 1024).toFixed(0);

  console.log(`Compresión completada: ${originalSizeKB} KB → ${compressedSizeKB} KB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reducción)`);

  return compressedFile;
}


// ═══════════════════════════════════════════════════════════
//  IMAGEN → DATA URL (para guardar directo en Firestore)
// ═══════════════════════════════════════════════════════════

/**
 * Convierte un File/Blob a Data URL (base64 con prefijo data:image/...).
 * Esto se guarda directamente en Firestore como string en el campo imageUrl.
 * Un <img src="data:image/jpeg;base64,..."> funciona igual que una URL normal.
 * @param {File|Blob} file — Archivo de imagen (ya comprimido a ~13KB)
 * @returns {Promise<string>} — Data URL lista para usar en <img src="">
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // data:image/jpeg;base64,...
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// ═══════════════════════════════════════════════════════════
//  UPLOAD FORM — Submit → Compress → Data URL → Firestore
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
  const progressToast = showToast('Preparando la cámara...', 'info', 0);

  try {
    // 1️⃣  Comprimir imagen en el cliente (de cualquier tamaño → ~13KB JPEG)
    const compressedFile = await compressImage(file);

    // 2️⃣  Convertir a Data URL (base64) para guardar directo en Firestore
    updateToast(progressToast, 'Revelando fotografía...');
    const imageUrl = await fileToDataUrl(compressedFile);

    // 3️⃣  Guardar entrada en Firestore (imagen incluida como Data URL)
    updateToast(progressToast, 'Escribiendo dedicatoria a mano...');
    await addDoc(getEntriesRef(), {
      nombre:      name,
      dedicatoria: message,
      imageUrl:    imageUrl,
      timestamp:   serverTimestamp()
    });

    // ✅ Éxito
    dismissToast(progressToast);
    showToast('¡Tu recuerdo ya está en el álbum!', 'success', 5000);
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
  $galleryGrid.innerHTML = '';
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
    // Use docChanges() for incremental updates (preserves animations)
    snapshot.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();

      if (change.type === 'added') {
        // Remove empty state if present
        const emptyState = $galleryGrid.querySelector('.gallery__empty-state');
        if (emptyState) emptyState.remove();

        renderPolaroidCard(id, data);
      }

      if (change.type === 'modified') {
        // Only update the likes count in-place (don't rebuild the card)
        const existingCard = $galleryGrid.querySelector(`[data-id="${id}"]`);
        if (existingCard) {
          const likeSpan = existingCard.querySelector('.polaroid__like span');
          if (likeSpan) {
            likeSpan.textContent = data.likes || 0;
          }
        }
      }

      if (change.type === 'removed') {
        const existingCards = $galleryGrid.querySelectorAll(`[data-id="${id}"]`);
        existingCards.forEach(c => c.remove());
      }
    });

    // Show empty state if gallery is now empty
    if (snapshot.empty) {
      $galleryGrid.innerHTML = `
        <div class="gallery__empty-state">
          <svg class="gallery__empty-icon" width="80" height="80" fill="none" stroke="var(--color-talavera)" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <p class="gallery__empty-title">El álbum está vacío</p>
          <p class="gallery__empty-text">¡Sé el primero en romper el hielo! Sube la primera foto de la fiesta.</p>
        </div>
      `;
    }
  }, (error) => {
    console.error('Error en el listener de la galería:', error);
    showToast('Error al cargar la galería. Recarga la página.', 'error', 6000);
  });
}


function renderPolaroidCard(id, data) {
  const card = document.createElement('article');
  card.className = 'polaroid';
  card.dataset.id = id;

  const isHost = localStorage.getItem('host_' + currentEventId) === 'true';
  if (isHost) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-photo';
    delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
    delBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.92); color: #B5533C; border: 1px solid rgba(181,83,60,0.3); border-radius: 50%; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.18); backdrop-filter: blur(4px);';
    delBtn.title = 'Borrar foto';
    
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('¿Seguro que quieres borrar permanentemente esta foto?')) {
        try {
          delBtn.disabled = true;
          delBtn.style.opacity = '0.5';
          await deleteDoc(doc(db, 'events', currentEventId, 'guest_entries', id));
          showToast('Foto eliminada exitosamente', 'success');
          card.remove();
        } catch(err) {
          console.error(err);
          showToast('Error al eliminar la foto', 'error');
          delBtn.disabled = false;
          delBtn.style.opacity = '1';
        }
      }
    });
    card.style.position = 'relative';
    queueMicrotask(() => card.appendChild(delBtn)); // tras innerHTML
  }

  const likesCount = data.likes || 0;
  // Checking local storage for likes (anonymous "auth")
  const likedArray = JSON.parse(localStorage.getItem('liked_photos') || '[]');
  const isLiked = likedArray.includes(id);

  card.innerHTML = `
    <div class="polaroid__img-wrapper">
      <img
        class="polaroid__img"
        src="${escapeAttr(data.imageUrl)}"
        alt="Foto de ${escapeHTML(data.nombre)}"
        crossorigin="anonymous"
        loading="lazy"
        decoding="async"
      >
    </div>
    <div class="polaroid__caption">
      ${data.dedicatoria
        ? `<em class="polaroid__message">${escapeHTML(data.dedicatoria)}</em>`
        : ''
      }
      <div class="polaroid__footer">
        <strong class="polaroid__name">${escapeHTML(data.nombre)}</strong>
        <button class="polaroid__like ${isLiked ? 'liked' : ''}" aria-label="Me gusta">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            ${isLiked 
              ? '<path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>' 
              : '<path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>'
            }
          </svg>
          <span>${likesCount}</span>
        </button>
      </div>
    </div>
  `;

  // Heart click listener
  const btnLike = card.querySelector('.polaroid__like');
  btnLike.addEventListener('click', async (e) => {
    e.preventDefault(); // Por si acaso evita comportamientos default
    
    // Optimistic UI update
    const likedNow = !btnLike.classList.contains('liked');
    const inc = likedNow ? 1 : -1;
    btnLike.classList.toggle('liked');
    
    // Leer el número actual directamente del HTML, no de la variable inicial
    const currentLikes = parseInt(btnLike.querySelector('span').textContent) || 0;
    btnLike.querySelector('span').textContent = Math.max(0, currentLikes + inc);

    // Heartbeat pop animation
    btnLike.classList.remove('pop');
    void btnLike.offsetWidth; // Force reflow to restart animation
    btnLike.classList.add('pop');

    // Change SVG path to filled or outline
    const svgPath = btnLike.querySelector('path');
    if (likedNow) {
      svgPath.setAttribute('fill-rule', 'evenodd');
      svgPath.setAttribute('d', 'M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z');
    } else {
      svgPath.removeAttribute('fill-rule');
      svgPath.setAttribute('d', 'm8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z');
    }

    // Save to local storage
    let ls = JSON.parse(localStorage.getItem('liked_photos') || '[]');
    if (likedNow) {
      ls.push(id);
    } else {
      ls = ls.filter(i => i !== id);
    }
    localStorage.setItem('liked_photos', JSON.stringify(ls));

    // Update in Firestore
    try {
      const entryRef = doc(db, 'events', currentEventId, 'guest_entries', id);
      
      if (likedNow) {
        // Sumar like: siempre seguro
        await updateDoc(entryRef, { likes: increment(1) });
      } else {
        // Restar like: leer primero para no caer en negativos
        const snap = await getDoc(entryRef);
        const currentDbLikes = snap.exists() ? (snap.data().likes || 0) : 0;
        if (currentDbLikes > 0) {
          await updateDoc(entryRef, { likes: increment(-1) });
        }
      }
    } catch (err) {
      console.error('Error al dar me gusta:', err);
    }
  });

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
function loadImageAsBase64(url, makeSquare = false) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        if (makeSquare) {
          const side = Math.min(img.naturalWidth, img.naturalHeight);
          const dx = (img.naturalWidth - side) / 2;
          const dy = (img.naturalHeight - side) / 2;
          c.width = side;
          c.height = side;
          c.getContext('2d').drawImage(img, dx, dy, side, side, 0, 0, side, side);
        } else {
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
        }
        resolve(c.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    if (url.startsWith('data:')) {
      img.src = url;
    } else {
      img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
    }
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

    // Helper: dibuja patrón de fondo con overlay
    updateToast(pdfToast, 'Preparando diseño...');
    const patternUrl = new URL('assets/talavera-pattern.jpg', document.baseURI).href;
    const patternB64 = await loadImageAsBase64(patternUrl);

    function drawBackground(r, g, b, opacity) {
      if (patternB64) {
        const pw = 120, ph = 150;
        for (let x = 0; x < W; x += pw) {
          for (let y = 0; y < H; y += ph) {
            doc.addImage(patternB64, 'JPEG', x, y, pw, ph);
          }
        }
        if (typeof doc.setGState === 'function') {
          doc.setGState(new doc.GState({ opacity }));
        }
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, W, H, 'F');
        if (typeof doc.setGState === 'function') {
          doc.setGState(new doc.GState({ opacity: 1.0 }));
        }
      } else {
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, W, H, 'F');
      }
    }

    // ══════════════════════════════════
    //  PORTADA
    // ══════════════════════════════════
    drawBackground(30, 56, 136, 0.88); // Azul fuerte difuminado

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text(window.currentEventTheme?.name || 'Nuestro Álbum', W / 2, H / 2 - 20, { align: 'center' });

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
        b64 = await loadImageAsBase64(img.src, true);
      }

      entries.push({
        nombre: nameEl ? nameEl.textContent.trim() : '',
        dedicatoria: msgEl ? msgEl.textContent.trim() : '',
        imgData: b64,
      });
    }

    // ══════════════════════════════════
    //  CUADRÍCULA 2 COLUMNAS (POLAROID)
    // ══════════════════════════════════
    updateToast(pdfToast, 'Generando tu álbum en PDF…');

    const MARGIN = 20;
    const GAP_X = 15;
    const GAP_Y = 20;
    const COLS = 2;
    const colW = (W - MARGIN * 2 - GAP_X * (COLS - 1)) / COLS;
    
    const pMargin = colW * 0.05; // Margen blanco lateral y superior
    const imgH = colW - (pMargin * 2); // Foto cuadrada
    const textH = colW * 0.28; // Espacio inferior texto
    const cardH = pMargin + imgH + textH;
    const ROWS_PER_PAGE = 2;

    let cardIndex = 0;

    while (cardIndex < entries.length) {
      doc.addPage();
      
      // Fondo de la página de contenido
      drawBackground(234, 240, 246, 0.92); // Blanco-azulado difuminado

      // Encabezado sutil de la página
      doc.setFillColor(30, 56, 136);
      doc.rect(0, 0, W, 6, 'F');

      for (let row = 0; row < ROWS_PER_PAGE && cardIndex < entries.length; row++) {
        for (let col = 0; col < COLS && cardIndex < entries.length; col++) {
          const entry = entries[cardIndex];
          const x = MARGIN + col * (colW + GAP_X);
          const y = MARGIN + 8 + row * (cardH + GAP_Y);

          // Fondo de tarjeta polaroid
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(220, 225, 235);
          doc.roundedRect(x, y, colW, cardH, 2, 2, 'FD');

          // Imagen (ya cuadrada)
          if (entry.imgData) {
            try {
              doc.addImage(entry.imgData, 'JPEG', x + pMargin, y + pMargin, imgH, imgH);
            } catch (e) {
              doc.setFillColor(234, 240, 246);
              doc.rect(x + pMargin, y + pMargin, imgH, imgH, 'F');
              doc.setTextColor(130, 140, 160);
              doc.setFontSize(10);
              doc.text('Sin imagen', x + colW / 2, y + pMargin + imgH / 2, { align: 'center' });
            }
          } else {
            doc.setFillColor(234, 240, 246);
            doc.rect(x + pMargin, y + pMargin, imgH, imgH, 'F');
            doc.setTextColor(130, 140, 160);
            doc.setFontSize(10);
            doc.text('Sin imagen', x + colW / 2, y + pMargin + imgH / 2, { align: 'center' });
          }

          // Nombre (centrado, tipo marcador)
          doc.setTextColor(28, 35, 49);
          doc.setFont('times', 'bold');
          doc.setFontSize(14);
          const textY = y + pMargin + imgH + 8;
          doc.text(entry.nombre || '', x + colW / 2, textY, { align: 'center' });

          // Dedicatoria (centrada, cursiva)
          if (entry.dedicatoria) {
            doc.setFont('times', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(80, 85, 95);
            const maxTextW = colW - (pMargin * 2);
            const lineas = doc.splitTextToSize(entry.dedicatoria, maxTextW);
            doc.text(lineas.slice(0, 4), x + colW / 2, textY + 6, { align: 'center' });
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
      doc.text(`${window.currentEventTheme?.name || 'Nuestro Álbum'} - pág. ${p - 1}`, W / 2, H - 6, { align: 'center' });
    }

    // ══════════════════════════════════
    //  GUARDAR
    // ══════════════════════════════════
    const slug = (window.currentEventTheme?.name || 'album').toLowerCase().replace(/\s+/g, '-');
    doc.save(`${slug}.pdf`);

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

// ═══════════════════════════════════════════════════════════
//  SLIDESHOW (PRESENTACIÓN EN VIVO)
// ═══════════════════════════════════════════════════════════
const $btnSlideshow = document.getElementById('btn-slideshow');
const $slideshowModal = document.getElementById('slideshow');
const $slideshowClose = document.getElementById('slideshow-close');
const $slideshowImg = document.getElementById('slideshow-img');
const $slideshowCaption = document.getElementById('slideshow-caption');

let slideshowInterval;
let currentSlideIndex = 0;

$btnSlideshow.addEventListener('click', async () => {
  const cards = document.querySelectorAll('.polaroid');
  if (cards.length === 0) {
    showToast('La galería está vacía.', 'info');
    return;
  }
  
  // Try to go fullscreen
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch (e) {
    console.log("Fullscreen API not supported or denied.");
  }
  
  $slideshowModal.hidden = false;
  currentSlideIndex = 0;
  showNextSlide();
  
  slideshowInterval = setInterval(() => {
    showNextSlide();
  }, 4000); // 4 seconds per slide
});

function showNextSlide() {
  const cards = document.querySelectorAll('.polaroid');
  if (cards.length === 0) {
    stopSlideshow();
    return;
  }
  
  if (currentSlideIndex >= cards.length) {
    currentSlideIndex = 0; // Loop back
  }
  
  const card = cards[currentSlideIndex];
  const imgSrc = card.querySelector('.polaroid__img').src;
  const name = card.querySelector('.polaroid__name').textContent;
  const msgEl = card.querySelector('.polaroid__message');
  const msg = msgEl ? msgEl.textContent : '';
  
  // Triggers CSS animation re-flow
  $slideshowImg.style.animation = 'none';
  $slideshowImg.offsetHeight; /* trigger reflow */
  $slideshowImg.style.animation = null;

  $slideshowImg.src = imgSrc;
  $slideshowCaption.innerHTML = `<strong>${escapeHTML(name)}</strong><br>${escapeHTML(msg)}`;
  
  currentSlideIndex++;
}

function stopSlideshow() {
  clearInterval(slideshowInterval);
  $slideshowModal.hidden = true;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log(err));
  }
}

$slideshowClose.addEventListener('click', stopSlideshow);

// ═══════════════════════════════════════════════════════════
//  PWA — Service Worker Registration
// ═══════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => console.log('PWA ServiceWorker registrado exitosamente con scope: ', registration.scope))
      .catch(err => console.log('Falló el registro del ServiceWorker: ', err));
  });
}


// ═══════════════════════════════════════════════════════════
//  FAB — Floating Camera Button (aparece al hacer scroll)
// ═══════════════════════════════════════════════════════════
const $fabCamera = document.getElementById('fab-camera');
const $uploadSection = document.getElementById('upload-section');

if ($fabCamera && $uploadSection) {
  // Show/hide FAB based on scroll position
  const fabObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Solo mostrar el FAB si estamos realmente en la pantalla del álbum
      const isAlbumActive = document.getElementById('screen-album').classList.contains('screen--active');
      
      // When the upload form scrolls OUT of view, show the FAB
      if (!entry.isIntersecting && isAlbumActive) {
        $fabCamera.classList.add('visible');
      } else {
        $fabCamera.classList.remove('visible');
      }
    });
  }, { threshold: 0 });

  fabObserver.observe($uploadSection);

  // Click FAB → scroll up to photo button and trigger it
  $fabCamera.addEventListener('click', () => {
    $uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Small delay to let the scroll finish, then trigger the photo input
    setTimeout(() => {
      $photoBtn.click();
    }, 400);
  });
}















// Copiar PIN desde el panel
document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-copy]');
  if (!chip) return;
  navigator.clipboard?.writeText(chip.dataset.copy);
  showToast('PIN copiado', 'success', 2000);
});
