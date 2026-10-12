import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { getEventType } from './eventTypes.js';
import { generateSurvivalPdf } from './generateSurvivalPdf.js';

const getDb = () => getFirestore(getApp());

function formatCaptureTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const VAULT_UI_THEMES = {
  marli: {
    name: 'Marli Cerámica',
    primary: '#1E3888',
    iconBg: 'rgba(30, 56, 136, 0.12)',
    iconColor: '#1E3888',
    chipBg: '#1E3888',
    badgeBg: 'rgba(30, 56, 136, 0.08)',
    badgeColor: '#1E3888',
    cardBorder: 'rgba(212, 175, 55, 0.45)',
    cardBg: 'linear-gradient(145deg, #0A0E1A 0%, #141D33 100%)',
    sealBg: 'rgba(212, 175, 55, 0.12)',
    sealColor: '#F3C766',
    editionTag: '#F3C766',
    btnBg: 'linear-gradient(135deg, #D4AF37 0%, #AA820A 100%)',
    btnColor: '#0A0E1A',
    btnShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
  },
  shots: {
    name: 'Cerámica Shots',
    primary: '#C0582F',
    iconBg: 'rgba(192, 88, 47, 0.12)',
    iconColor: '#C0582F',
    chipBg: '#C0582F',
    badgeBg: 'rgba(192, 88, 47, 0.1)',
    badgeColor: '#C0582F',
    cardBorder: 'rgba(229, 169, 60, 0.45)',
    cardBg: 'linear-gradient(145deg, #160D09 0%, #261711 100%)',
    sealBg: 'rgba(229, 169, 60, 0.14)',
    sealColor: '#F6C978',
    editionTag: '#F6C978',
    btnBg: 'linear-gradient(135deg, #E5A93C 0%, #B87B1A 100%)',
    btnColor: '#140E0A',
    btnShadow: '0 8px 24px rgba(229, 169, 60, 0.35)',
  },
  odimar: {
    name: 'Cerámica Odimar',
    primary: '#D66D63',
    iconBg: 'rgba(214, 109, 99, 0.12)',
    iconColor: '#D66D63',
    chipBg: '#D66D63',
    badgeBg: 'rgba(214, 109, 99, 0.1)',
    badgeColor: '#D66D63',
    cardBorder: 'rgba(242, 167, 157, 0.5)',
    cardBg: 'linear-gradient(145deg, #170C15 0%, #291625 100%)',
    sealBg: 'rgba(235, 140, 130, 0.14)',
    sealColor: '#F8D0C7',
    editionTag: '#F8D0C7',
    btnBg: 'linear-gradient(135deg, #F2A79D 0%, #C97268 100%)',
    btnColor: '#150B12',
    btnShadow: '0 8px 24px rgba(242, 167, 157, 0.35)',
  }
};

export default function SurvivalScreen({ eventCode, isHost, type, themeKey = 'marli' }) {
  const cfg = getEventType(type);
  const activeTheme = VAULT_UI_THEMES[((themeKey || window.currentThemeKey || 'marli')).toLowerCase()] || VAULT_UI_THEMES.marli;

  const [config, setConfig] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  // Escuchar configuración de supervivencia
  useEffect(() => {
    if (!eventCode) return;
    const configRef = doc(getDb(), 'events', eventCode, 'survival', 'config');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        setConfig(null);
      }
    });
    return () => unsub();
  }, [eventCode]);

  // Escuchar fotos de supervivencia (solo una vez revelada la bóveda)
  const revealedForPhotos = Boolean(config?.revealAt && Date.now() >= config.revealAt);
  useEffect(() => {
    if (!eventCode || !revealedForPhotos) return;
    const q = query(
      collection(getDb(), 'events', eventCode, 'survival_photos'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPhotos(docs);
      setLoading(false);
    });
    return () => unsub();
  }, [eventCode, revealedForPhotos]);

  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();
    if (!confirm('¿Deseas eliminar esta fotografía de la bóveda?')) return;
    try {
      await deleteDoc(doc(getDb(), 'events', eventCode, 'survival_photos', photoId));
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    } catch (err) {
      console.error('Error al borrar foto:', err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!isHost) {
      alert('La descarga del álbum completo de la bóveda está reservada para los organizadores.');
      return;
    }
    if (downloadingPdf) return;
    if (photos.length === 0) {
      alert('Aún no hay fotos en la bóveda para descargar.');
      return;
    }
    setDownloadingPdf(true);
    try {
      await generateSurvivalPdf({
        eventCode,
        config,
        photos,
        eventTypeLabel: cfg.label,
        themeKey: (themeKey || window.currentThemeKey || 'marli'),
        onProgress: (msg) => setPdfProgress(msg)
      });
    } catch (err) {
      console.error('Error generando PDF de la Bóveda:', err);
      alert(err.message || 'Error al generar el PDF de la Bóveda.');
    } finally {
      setDownloadingPdf(false);
      setPdfProgress('');
    }
  };

  const isRevealed = config?.revealAt ? Date.now() >= config.revealAt : false;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '16px 20px 80px' }}>
      {/* Encabezado Principal de la Bóveda */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: activeTheme.iconBg,
            color: activeTheme.iconColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: `0 8px 24px ${activeTheme.iconBg}`,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
          </svg>
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            color: 'var(--color-charcoal, #2B2625)',
            margin: '0 0 8px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {config?.title || 'La Bóveda Secreta'}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.98rem',
            color: 'var(--color-charcoal-light, #666)',
            maxWidth: '520px',
            margin: '0 auto 1.25rem',
            lineHeight: 1.5,
          }}
        >
          {config?.prompt || 'Las fotografías espontáneas tomadas en el momento cumbre del evento. ¡Descubre quiénes sobrevivieron a la noche!'}
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              background: activeTheme.chipBg,
              color: '#FFFFFF',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: `0 4px 12px ${activeTheme.iconBg}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {photos.length} {photos.length === 1 ? 'Sobreviviente' : 'Sobrevivientes'}
          </span>

          {config?.unlockAt && (
            <span
              style={{
                background: 'rgba(28, 35, 49, 0.08)',
                color: 'var(--color-charcoal, #2B2625)',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Hora del reto: {new Date(config.unlockAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Lista / Grid de Fotos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
          <svg className="spinner" viewBox="0 0 24 24" style={{ width: '32px', height: '32px', margin: '0 auto 12px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          </svg>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Abriendo la bóveda...</p>
        </div>
      ) : photos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '24px',
            border: '1px dashed rgba(30, 56, 136, 0.3)',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(30, 56, 136, 0.08)',
              color: '#1E3888',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#2B2625', fontWeight: 600 }}>
            La bóveda está vacía
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#666', lineHeight: 1.45 }}>
            No se capturaron fotografías de supervivencia en el horario programado.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {photos.map((p) => {
            const timeStr = formatCaptureTime(p.timestamp);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPhoto(p)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 14px 32px rgba(30, 56, 136, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
                }}
              >
                {/* Botón borrar anfitrión */}
                {isHost && (
                  <button
                    type="button"
                    onClick={(e) => handleDeletePhoto(p.id, e)}
                    title="Eliminar foto"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 3,
                      backdropFilter: 'blur(8px)',
                      transition: 'background 0.2s',
                    }}
                  >
                    ✕
                  </button>
                )}

                {/* Badge de Hora de Captura */}
                {timeStr && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(28, 35, 49, 0.85)',
                      color: '#FFFFFF',
                      borderRadius: '999px',
                      padding: '3px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                      zIndex: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>{timeStr}</span>
                  </div>
                )}

                {/* Imagen */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '115%', background: '#1c2331' }}>
                  <img
                    src={p.photoUrl}
                    alt={p.author}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Información al pie */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-charcoal, #2B2625)' }}>
                      {p.author}
                    </span>
                    <span
                      style={{
                        background: activeTheme.badgeBg,
                        color: activeTheme.badgeColor,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Sobreviviente
                    </span>
                  </div>

                  {p.caption && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.82rem',
                        color: '#555',
                        lineHeight: 1.4,
                        fontStyle: 'italic',
                      }}
                    >
                      "{p.caption}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sección Conmemorativa para Descargar todo el Álbum de la Bóveda (Solo Organizadores) */}
      {isHost && photos.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '3.5rem',
            padding: '2.5rem 1.6rem',
            background: activeTheme.cardBg,
            borderRadius: '26px',
            border: `1.5px solid ${activeTheme.cardBorder}`,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: activeTheme.sealBg,
              color: activeTheme.sealColor,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: `1px solid ${activeTheme.cardBorder}`,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: activeTheme.editionTag,
            marginBottom: '6px'
          }}>
            Edición Conmemorativa de Honor
          </div>
          <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-serif, serif)' }}>
            Libro de la Bóveda de Sobrevivientes
          </h3>
          <p style={{ margin: '0 auto 1.6rem', fontSize: '0.9rem', color: '#CBD5E1', maxWidth: '480px', lineHeight: 1.55 }}>
            Descarga el libro conmemorativo oficial en formato PDF de alta resolución. Incluye la portada de honor nocturna con sello de la marca, cada foto con su hora exacta y el Certificado Oficial de Supervivencia.
          </p>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{
              maxWidth: '380px',
              width: '100%',
              margin: '0 auto',
              padding: '14px 24px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '999px',
              background: activeTheme.btnBg,
              color: activeTheme.btnColor,
              border: 'none',
              cursor: downloadingPdf ? 'wait' : 'pointer',
              boxShadow: activeTheme.btnShadow,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{downloadingPdf ? (pdfProgress || 'Generando PDF...') : 'Descargar Todo el Álbum de la Bóveda (PDF)'}</span>
          </button>
        </div>
      )}

      {/* Lightbox / Visor de Foto a Pantalla Completa */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 14, 25, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'tabFadeIn 0.25s ease-out forwards',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Cerrar visor"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                backdropFilter: 'blur(8px)',
              }}
            >
              ✕
            </button>

            {/* Imagen en grande */}
            <div style={{ background: '#000', maxHeight: '65vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.author}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            {/* Metadatos */}
            <div style={{ padding: '1.25rem 1.5rem', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#2B2625' }}>
                  {selectedPhoto.author}
                </h4>
                {selectedPhoto.timestamp && (
                  <span
                    style={{
                      background: 'rgba(30, 56, 136, 0.08)',
                      color: '#1E3888',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    🕒 {formatCaptureTime(selectedPhoto.timestamp)}
                  </span>
                )}
              </div>

              {selectedPhoto.caption && (
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#555', fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{selectedPhoto.caption}"
                </p>
              )}

              {/* Botón para abrir/descargar foto original */}
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '8px' }}>
                <a
                  href={selectedPhoto.photoUrl}
                  download={`sobreviviente-${selectedPhoto.author.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    textAlign: 'center',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Guardar foto
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
