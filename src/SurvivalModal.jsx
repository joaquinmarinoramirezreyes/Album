import React, { useState, useEffect, useRef } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, doc, onSnapshot, setDoc, collection, addDoc,
  deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { getEventType } from './eventTypes.js';

const getDb = () => getFirestore(getApp());

// Helper para comprimir foto en el cliente antes de guardar en Firestore
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Formato de cuenta regresiva (HH:MM:SS o Días si es mayor)
function formatTimeLeft(ms) {
  if (ms <= 0) return { h: '00', m: '00', s: '00', totalSeconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    h: String(hours).padStart(2, '0'),
    m: String(minutes).padStart(2, '0'),
    s: String(seconds).padStart(2, '0'),
    totalSeconds
  };
}

// Formatear fecha y hora legible (ej. "Sáb 2:00 AM")
function formatDateTime(timestampMs) {
  if (!timestampMs) return '';
  const d = new Date(timestampMs);
  return d.toLocaleString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Convertir timestamp a formato input datetime-local
function toInputDateTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// Generar o recuperar ID de visitante local para rastrear su propia foto
function getVisitorId() {
  let id = localStorage.getItem('survival_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    localStorage.setItem('survival_visitor_id', id);
  }
  return id;
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENTE: SurvivalPillButton (El botón en la barra superior)
// ═══════════════════════════════════════════════════════════════
export function SurvivalPillButton({ eventCode, isHost, onClick, onOpenVault }) {
  const [config, setConfig] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    if (!eventCode) return;
    const unsubConfig = onSnapshot(doc(getDb(), 'events', eventCode, 'survival', 'config'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
      else setConfig(null);
    });
    const unsubPhotos = onSnapshot(collection(getDb(), 'events', eventCode, 'survival_photos'), (snap) => {
      setPhotoCount(snap.size);
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsubConfig();
      unsubPhotos();
      clearInterval(timer);
    };
  }, [eventCode]);

  // Base styles para la cápsula flotante inferior
  const baseCapsuleStyle = {
    position: 'fixed',
    bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 950,
    borderRadius: '999px',
    padding: '9px 18px',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.22)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease',
  };

  // Si no está configurado aún
  if (!config?.unlockAt) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...baseCapsuleStyle,
          background: 'rgba(28, 35, 49, 0.92)',
          color: '#FFFFFF',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{isHost ? 'Programar Supervivencia' : 'Foto de Supervivencia'}</span>
      </button>
    );
  }

  const isUnlocked = now >= config.unlockAt;
  const isRevealed = config.revealAt && now >= config.revealAt;
  const timeToUnlock = config.unlockAt - now;
  const formattedCountdown = formatTimeLeft(timeToUnlock);

  // Fase 3: Revelado
  if (isRevealed) {
    return (
      <button
        type="button"
        onClick={() => {
          if (onOpenVault) onOpenVault();
          else onClick();
        }}
        style={{
          ...baseCapsuleStyle,
          background: 'linear-gradient(135deg, #1E3888 0%, #15275e 100%)',
          color: '#FFFFFF',
          boxShadow: '0 10px 32px rgba(30, 56, 136, 0.45)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </svg>
        <span>Bóveda Abierta ({photoCount})</span>
      </button>
    );
  }

  // Fase 2: Desbloqueado para tomar fotos (Activo con destello)
  if (isUnlocked) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...baseCapsuleStyle,
          background: 'linear-gradient(135deg, #b5533c 0%, #8f3e2b 100%)',
          color: '#FFFFFF',
          boxShadow: '0 10px 32px rgba(181, 83, 60, 0.5)',
          animation: 'survivalPulse 2.4s ease-in-out infinite'
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span>¡Foto de Supervivencia Activa!</span>
      </button>
    );
  }

  // Fase 1: Bloqueado con contador regresivo
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...baseCapsuleStyle,
        background: 'rgba(28, 35, 49, 0.92)',
        color: '#FFFFFF',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>
        Supervivencia: {formattedCountdown.h}:{formattedCountdown.m}:{formattedCountdown.s}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL: SurvivalModal
// ═══════════════════════════════════════════════════════════════
export default function SurvivalModal({ eventCode, isHost, type, isOpen, onClose }) {
  const cfg = getEventType(type);
  const visitorId = getVisitorId();

  const [config, setConfig] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Formulario del anfitrión
  const [configForm, setConfigForm] = useState({
    unlockAt: '',
    revealAt: '',
    title: '',
    prompt: ''
  });

  // Formulario del invitado para subir su foto
  const [uploadPhoto, setUploadPhoto] = useState(null);
  const [authorName, setAuthorName] = useState(localStorage.getItem('guest_author_name') || '');
  const [caption, setCaption] = useState('');
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Intervalo para actualizar el reloj en vivo cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Escuchar configuración de supervivencia
  useEffect(() => {
    if (!eventCode) return;
    const unsub = onSnapshot(doc(getDb(), 'events', eventCode, 'survival', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig(data);
        setConfigForm({
          unlockAt: toInputDateTime(data.unlockAt),
          revealAt: toInputDateTime(data.revealAt),
          title: data.title || '',
          prompt: data.prompt || ''
        });
      } else {
        setConfig(null);
        // Si no hay configuración y es anfitrión, sugerir hoy a la 1:00 AM y revelación mañana a las 10:00 AM
        const tonight = new Date();
        tonight.setHours(25, 0, 0, 0); // Mañana a la 1:00 AM
        const tomorrowMorning = new Date(tonight);
        tomorrowMorning.setHours(10, 0, 0, 0);

        setConfigForm({
          unlockAt: toInputDateTime(tonight.getTime()),
          revealAt: toInputDateTime(tomorrowMorning.getTime()),
          title: cfg.label === 'posada' ? 'Supervivencia de la Posada' : 'Foto de Supervivencia',
          prompt: cfg.label === 'posada' 
            ? '¿Quién sobrevivió a la fiesta de fin de año? Tómate tu foto ahora.'
            : 'Demuestra que sigues de pie. Tómate una foto tal como estás ahora.'
        });
      }
    });
    return () => unsub();
  }, [eventCode, cfg.label]);

  // Escuchar fotos de supervivencia
  useEffect(() => {
    if (!eventCode) return;
    const q = query(collection(getDb(), 'events', eventCode, 'survival_photos'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhotos(items);
    });
    return () => unsub();
  }, [eventCode]);

  // Foto subida por este visitante
  const myPhoto = photos.find(p => p.visitorId === visitorId);

  // Fases del reto
  const hasConfig = Boolean(config?.unlockAt);
  const isUnlocked = hasConfig && now >= config.unlockAt;
  const isRevealed = hasConfig && config?.revealAt && now >= config.revealAt;
  const timeToUnlock = hasConfig ? config.unlockAt - now : 0;
  const timeToReveal = (hasConfig && config?.revealAt) ? config.revealAt - now : 0;

  const countdownUnlock = formatTimeLeft(timeToUnlock);
  const countdownReveal = formatTimeLeft(timeToReveal);

  // Guardar configuración del anfitrión
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configForm.unlockAt) {
      alert('Por favor selecciona la fecha y hora de desbloqueo.');
      return;
    }
    setSavingConfig(true);
    try {
      const unlockMs = new Date(configForm.unlockAt).getTime();
      let revealMs = configForm.revealAt ? new Date(configForm.revealAt).getTime() : unlockMs + (8 * 3600 * 1000);
      if (revealMs <= unlockMs) {
        revealMs = unlockMs + (8 * 3600 * 1000); // Mínimo 8 horas después
      }

      const configRef = doc(getDb(), 'events', eventCode, 'survival', 'config');
      await setDoc(configRef, {
        unlockAt: unlockMs,
        revealAt: revealMs,
        title: configForm.title.trim() || 'Foto de Supervivencia',
        prompt: configForm.prompt.trim() || 'Demuestra que sigues de pie. Tómate una foto del momento.',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsEditingConfig(false);
    } catch (err) {
      console.error('Error al guardar configuración de supervivencia:', err);
      alert('Hubo un error al guardar. Intenta de nuevo.');
    }
    setSavingConfig(false);
  };

  // Selección de foto
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setUploadPhoto(compressed);
    } catch (err) {
      console.error('Error al comprimir foto:', err);
      alert('No se pudo procesar la imagen. Intenta con otra foto.');
    }
  };

  // Enviar foto a la bóveda
  const handleSubmitPhoto = async (e) => {
    e.preventDefault();
    if (!uploadPhoto) {
      alert('Por favor toma o selecciona una foto.');
      return;
    }
    if (!authorName.trim()) {
      alert('Por favor escribe tu nombre.');
      return;
    }

    setSubmittingPhoto(true);
    try {
      localStorage.setItem('guest_author_name', authorName.trim());
      await addDoc(collection(getDb(), 'events', eventCode, 'survival_photos'), {
        photoUrl: uploadPhoto,
        author: authorName.trim(),
        caption: caption.trim(),
        visitorId: visitorId,
        timestamp: serverTimestamp()
      });
      setUploadPhoto(null);
      setCaption('');
    } catch (err) {
      console.error('Error al subir foto de supervivencia:', err);
      alert('Hubo un problema al guardar tu foto. Intenta de nuevo.');
    }
    setSubmittingPhoto(false);
  };

  // Borrar foto (Moderación Anfitrión)
  const handleDeletePhoto = async (photoId) => {
    if (!confirm('¿Deseas eliminar esta foto de la bóveda?')) return;
    try {
      await deleteDoc(doc(getDb(), 'events', eventCode, 'survival_photos', photoId));
    } catch (err) {
      console.error('Error al borrar foto:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="survival-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 14, 25, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'tabFadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
      }}
    >
      <div
        className="survival-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '26px',
          maxWidth: '480px',
          width: '100%',
          padding: '2rem 1.6rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#666',
            fontSize: '1rem',
            fontWeight: 700
          }}
        >
          ✕
        </button>

        {/* Botón ajustes para el Anfitrión */}
        {isHost && (
          <button
            type="button"
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            title="Configurar horario"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: isEditingConfig ? 'var(--color-primary, #b5533c)' : 'rgba(0, 0, 0, 0.05)',
              color: isEditingConfig ? '#FFFFFF' : '#666',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        )}

        {/* MODO EDICIÓN ANFITRIÓN */}
        {isEditingConfig ? (
          <form onSubmit={handleSaveConfig} style={{ textAlign: 'left', marginTop: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: 'var(--color-primary, #b5533c)', fontWeight: 700, textAlign: 'center' }}>
              Configurar Reto de Supervivencia
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#666', textAlign: 'center', margin: '0 0 1.25rem' }}>
              Define a qué hora se desbloqueará la cámara para los invitados y cuándo se abrirá la bóveda secreta.
            </p>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Hora en que se desbloquea el botón (Captura)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={configForm.unlockAt}
                onChange={(e) => setConfigForm({ ...configForm, unlockAt: e.target.value })}
                required
                style={{ fontSize: '0.88rem' }}
              />
              <small style={{ color: '#888', fontSize: '0.74rem' }}>
                Ejemplo: Hoy a las 02:00 AM durante el clímax de la fiesta.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Hora de apertura de la Bóveda (Revelación al día siguiente)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={configForm.revealAt}
                onChange={(e) => setConfigForm({ ...configForm, revealAt: e.target.value })}
                required
                style={{ fontSize: '0.88rem' }}
              />
              <small style={{ color: '#888', fontSize: '0.74rem' }}>
                Nadie podrá ver las fotos antes de esta hora (ej: Mañana a las 10:00 AM).
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Título del reto
              </label>
              <input
                type="text"
                className="form-input"
                value={configForm.title}
                onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                placeholder="Ej. Foto de Supervivencia"
                maxLength={40}
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Instrucción para los invitados
              </label>
              <input
                type="text"
                className="form-input"
                value={configForm.prompt}
                onChange={(e) => setConfigForm({ ...configForm, prompt: e.target.value })}
                placeholder="Ej. Tómate una foto tal como estás ahora mismo."
                maxLength={90}
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1, padding: '0.65rem' }} disabled={savingConfig}>
                {savingConfig ? 'Guardando...' : 'Guardar Horario'}
              </button>
              <button type="button" className="btn btn--secondary" style={{ flex: 1, padding: '0.65rem' }} onClick={() => setIsEditingConfig(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : !hasConfig ? (
          /* CASO SIN CONFIGURACIÓN TODAVÍA */
          <div style={{ padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(181, 83, 60, 0.08)',
              color: 'var(--color-primary, #b5533c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#2b2625', fontWeight: 700 }}>
              Reto de Supervivencia
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {isHost
                ? 'Como anfitrión, puedes fijar la hora exacta de la noche en que se desbloqueará la cámara secreta para los invitados.'
                : 'Los organizadores están preparando el Reto de Supervivencia. En cuanto fijen la hora, aquí verás la cuenta regresiva.'}
            </p>
            {isHost && (
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => setIsEditingConfig(true)}
                style={{ padding: '0.75rem', borderRadius: '14px' }}
              >
                Fijar hora de desbloqueo
              </button>
            )}
          </div>
        ) : isRevealed ? (
          /* FASE 3: BÓVEDA REVELADA (AL DÍA SIGUIENTE) */
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(30, 56, 136, 0.08)',
              color: '#1E3888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.35rem', color: '#1E3888', fontWeight: 700 }}>
              ¡La Bóveda está Abierta!
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#555', margin: '0 0 1.5rem', lineHeight: 1.45 }}>
              Aquí están las fotos de los sobrevivientes tomadas en el momento cumbre del evento.
            </p>

            {photos.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem', padding: '2rem 0' }}>
                Nadie se tomó la foto de supervivencia anoche.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                textAlign: 'left'
              }}>
                {photos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#F8F9FA',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid #EBECEF',
                      position: 'relative'
                    }}
                  >
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(p.id)}
                        title="Eliminar foto"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          zIndex: 2
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <img
                      src={p.photoUrl}
                      alt={p.author}
                      style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      loading="lazy"
                    />
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#2B2625' }}>
                        {p.author}
                      </p>
                      {p.caption && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                          "{p.caption}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isUnlocked ? (
          /* FASE 2: DESBLOQUEADO (HORA DE CAPTURAR LA FOTO) */
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(181, 83, 60, 0.1)',
              color: 'var(--color-primary, #b5533c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>

            <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--color-primary, #b5533c)', fontWeight: 700 }}>
              {config.title || '¡Foto de Supervivencia!'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#555', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              {config.prompt || 'Demuestra que sigues de pie. Tómate una foto tal como estás ahora mismo.'}
            </p>

            {/* Si este usuario ya subió su foto */}
            {myPhoto ? (
              <div style={{
                background: '#FAF6F4',
                border: '1px solid rgba(181, 83, 60, 0.2)',
                borderRadius: '18px',
                padding: '1.25rem 1rem',
                textAlign: 'center'
              }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.85rem' }}>
                  <img
                    src={myPhoto.photoUrl}
                    alt="Tu foto de supervivencia"
                    style={{
                      maxHeight: '180px',
                      borderRadius: '14px',
                      display: 'block',
                      border: '2px solid var(--color-primary, #b5533c)',
                      filter: 'contrast(1.05)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10, 14, 25, 0.85)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    En custodia secreta
                  </div>
                </div>

                <h4 style={{ margin: '0 0 0.35rem', color: '#2B2625', fontSize: '1rem', fontWeight: 700 }}>
                  ¡Tu foto está guardada bajo llave!
                </h4>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#666', lineHeight: 1.45 }}>
                  Nadie podrá ver tu foto (ni la de los demás) hasta mañana a las{' '}
                  <strong>{formatDateTime(config.revealAt)}</strong>.
                </p>

                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--color-primary, #b5533c)',
                  fontWeight: 600
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>Se revela en: {countdownReveal.h}h {countdownReveal.m}m {countdownReveal.s}s</span>
                </div>
              </div>
            ) : (
              /* Formulario para capturar y enviar foto */
              <form onSubmit={handleSubmitPhoto} style={{ textAlign: 'left' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                />

                {/* Vista previa o botón de cámara */}
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  {uploadPhoto ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={uploadPhoto}
                        alt="Vista previa"
                        style={{
                          maxHeight: '190px',
                          borderRadius: '16px',
                          display: 'block',
                          border: '2px solid var(--color-primary, #b5533c)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setUploadPhoto(null)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#d32f2f',
                          color: '#fff',
                          border: '2px solid #fff',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '1.75rem 1rem',
                        border: '2px dashed rgba(181, 83, 60, 0.35)',
                        borderRadius: '18px',
                        background: '#FAF6F4',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--color-primary, #b5533c)'
                      }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                        Tomar foto de supervivencia
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#777' }}>
                        (Cámara frontal o trasera)
                      </span>
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tu Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ej. Roberto"
                    maxLength={35}
                    required
                    style={{ fontSize: '0.88rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Frase rápida (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ej. Sigo en la pista de baile"
                    maxLength={60}
                    style={{ fontSize: '0.88rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={submittingPhoto || !uploadPhoto}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '16px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(181, 83, 60, 0.3)'
                  }}
                >
                  {submittingPhoto ? 'Sellando en la bóveda...' : 'Guardar en la Bóveda Secreta 🔒'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* FASE 1: BLOQUEADO (CUENTA REGRESIVA) */
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(181, 83, 60, 0.08)',
              color: 'var(--color-primary, #b5533c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.4rem', color: '#2B2625', fontWeight: 700 }}>
              {config.title || 'Cápsula de Supervivencia'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#666', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Esta cámara está sellada. Se desbloqueará a las <strong>{formatDateTime(config.unlockAt)}</strong> para capturar quién sigue de pie.
            </p>

            {/* Display gigante de cuenta regresiva */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '1.75rem'
            }}>
              <div style={{
                background: '#FAF6F4',
                borderRadius: '16px',
                padding: '12px 14px',
                minWidth: '65px',
                border: '1px solid rgba(181, 83, 60, 0.15)'
              }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary, #b5533c)' }}>
                  {countdownUnlock.h}
                </span>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Horas</span>
              </div>
              <div style={{
                background: '#FAF6F4',
                borderRadius: '16px',
                padding: '12px 14px',
                minWidth: '65px',
                border: '1px solid rgba(181, 83, 60, 0.15)'
              }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary, #b5533c)' }}>
                  {countdownUnlock.m}
                </span>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Min</span>
              </div>
              <div style={{
                background: '#FAF6F4',
                borderRadius: '16px',
                padding: '12px 14px',
                minWidth: '65px',
                border: '1px solid rgba(181, 83, 60, 0.15)'
              }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary, #b5533c)' }}>
                  {countdownUnlock.s}
                </span>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Seg</span>
              </div>
            </div>

            {/* Regla de oro */}
            <div style={{
              background: '#F8F9FA',
              borderRadius: '14px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#555',
              lineHeight: 1.45,
              border: '1px dashed #DDD'
            }}>
              🔒 <strong>Regla del reto:</strong> Las fotos que se suban quedarán en una bóveda secreta. <strong>Nadie podrá verlas hasta el día siguiente</strong> para revivir juntos cómo terminó la fiesta.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
