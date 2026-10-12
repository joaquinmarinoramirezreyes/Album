import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp
} from 'firebase/firestore';

import { getEventType } from './eventTypes.js';

const getDb = () => getFirestore(getApp());

export default function WelcomeModal({ eventCode, isHost, type, isOpen, onClose }) {
  const cfg = getEventType(type);
  const DEFAULT_TITLE = cfg.welcomeTitle;
  const [welcome, setWelcome] = useState({
    title: cfg.welcomeTitle,
    subtitle: '',
    message: cfg.welcomeMessage,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', message: '' });

  useEffect(() => {
    if (!eventCode) return;
    const welcomeRef = doc(getDb(), 'events', eventCode, 'welcome', 'info');
    const unsub = onSnapshot(welcomeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWelcome({
          title: data.title || DEFAULT_TITLE,
          subtitle: data.subtitle || '',
          message: data.message || cfg.welcomeMessage,
        });
      }
    }, (err) => {
      console.warn('Welcome doc listener:', err);
    });
    return () => unsub();
  }, [eventCode]);

  const handleStartEdit = () => {
    setForm({
      title: welcome.title,
      subtitle: welcome.subtitle,
      message: welcome.message
    });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const welcomeRef = doc(getDb(), 'events', eventCode, 'welcome', 'info');
      await setDoc(welcomeRef, {
        title: form.title.trim() || DEFAULT_TITLE,
        subtitle: form.subtitle.trim(),
        message: form.message.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setIsEditing(false);
    } catch (err) {
      console.error('Error al guardar mensaje de bienvenida:', err);
      alert('Hubo un error al guardar el mensaje. Intenta de nuevo.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="welcome-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'tabFadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
      }}
    >
      <div 
        className="welcome-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '28px',
          maxWidth: '460px',
          width: '100%',
          padding: '2.25rem 1.75rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          position: 'relative',
          maxHeight: '88vh',
          overflowY: 'auto'
        }}
      >
        {/* Botón de cerrar X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
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

        {/* Icono decorativo SVG */}
        <div style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: 'rgba(181, 83, 60, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: 'var(--color-primary, #b5533c)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>

        {/* Modo edición para anfitrión */}
        {isEditing ? (
          <form onSubmit={handleSave} style={{ textAlign: 'left' }} noValidate>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: 'var(--color-primary, #b5533c)', textAlign: 'center', fontWeight: '600' }}>
              Personalizar Bienvenida
            </h3>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Título principal</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. ¡Bienvenidos a nuestra boda!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={60}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Subtítulo o Nombres (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Mariana & Carlos • 24 de Octubre"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                maxLength={80}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Mensaje para los invitados</label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="Escribe tu mensaje emotivo..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={{ resize: 'vertical', lineHeight: '1.45', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1, padding: '0.65rem' }} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1, padding: '0.65rem' }}
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          /* Vista normal de la carta de bienvenida */
          <div>
            {welcome.subtitle && (
              <p style={{ 
                fontSize: '0.82rem', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                fontWeight: '600', 
                color: 'var(--color-primary, #b5533c)',
                margin: '0 0 0.4rem'
              }}>
                {welcome.subtitle}
              </p>
            )}

            <h2 style={{ 
              fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)', 
              fontSize: '1.6rem', 
              lineHeight: 1.25, 
              color: 'var(--color-charcoal, #2B2625)', 
              margin: '0 0 1rem',
              fontWeight: 700
            }}>
              {welcome.title}
            </h2>

            <div style={{ width: '40px', height: '2px', background: 'var(--color-primary, #b5533c)', opacity: 0.35, margin: '0 auto 1.25rem' }} />

            <p style={{ 
              fontSize: '0.98rem', 
              lineHeight: 1.65, 
              color: 'var(--color-charcoal-light, #575251)', 
              whiteSpace: 'pre-line',
              margin: '0 0 1.75rem',
              textAlign: 'center'
            }}>
              {welcome.message}
            </p>

            {/* Botón modo anfitrión para editar */}
            {isHost && (
              <div style={{ marginBottom: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn--secondary" 
                  onClick={handleStartEdit}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    borderRadius: '999px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Editar mensaje
                </button>
              </div>
            )}

            {/* Botón principal para entrar */}
            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={onClose}
              style={{
                padding: '0.85rem',
                fontSize: '0.98rem',
                fontWeight: 600,
                borderRadius: '16px',
                boxShadow: '0 6px 20px rgba(181, 83, 60, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Continuar al evento</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
