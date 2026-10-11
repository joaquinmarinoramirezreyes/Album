import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

export default function WelcomeScreen({ eventCode, isHost, onNavigate }) {
  const [welcome, setWelcome] = useState({
    title: '¡Bienvenidos a nuestra celebración!',
    subtitle: '',
    message: 'Estamos inmensamente felices de compartir este día tan especial con todos ustedes.\n\nGracias por acompañarnos, por su cariño y por ser parte de nuestra historia. ¡Disfruten cada instante, celebren con nosotros y no olviden capturar los mejores momentos en nuestro álbum!',
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
          title: data.title || '¡Bienvenidos a nuestra celebración!',
          subtitle: data.subtitle || '',
          message: data.message || '',
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
        title: form.title.trim() || '¡Bienvenidos a nuestra celebración!',
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

  return (
    <div className="welcome-container" style={{ padding: '0.5rem 1rem 3rem', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Botón modo anfitrión para editar */}
      {isHost && !isEditing && (
        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <button 
            type="button" 
            className="btn btn--secondary" 
            onClick={handleStartEdit}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '0.6rem 1.2rem',
              fontSize: '0.9rem',
              borderRadius: '999px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Editar mensaje de bienvenida
          </button>
        </div>
      )}

      {/* Formulario de edición para el anfitrión */}
      {isEditing && (
        <div className="upload singles-form-container" style={{ marginBottom: '2rem' }}>
          <form className="upload__form" onSubmit={handleSave} noValidate>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: 'var(--color-primary, #b5533c)', textAlign: 'center', fontWeight: '600' }}>
              Personalizar Bienvenida
            </h3>

            <div className="form-group">
              <label className="form-label">Título principal</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. ¡Bienvenidos a nuestra boda!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subtítulo o Nombres (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Mariana & Carlos • 24 de Octubre"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                maxLength={80}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje para los invitados</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Escribe tu mensaje emotivo, recomendaciones o agradecimientos..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={{ resize: 'vertical', lineHeight: '1.5' }}
              />
            </div>

            <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar mensaje'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--full"
              style={{ marginTop: '10px' }}
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Tarjeta de visualización de Bienvenida */}
      {!isEditing && (
        <article 
          className="welcome-card" 
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '2.5rem 1.75rem',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Adorno decorativo superior */}
          <div style={{ marginBottom: '1.25rem', opacity: 0.85, color: 'var(--color-primary, #b5533c)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>

          {welcome.subtitle && (
            <p style={{ 
              fontSize: '0.85rem', 
              letterSpacing: '0.12em', 
              textTransform: 'uppercase', 
              fontWeight: '600', 
              color: 'var(--color-primary, #b5533c)',
              marginBottom: '0.5rem'
            }}>
              {welcome.subtitle}
            </p>
          )}

          <h2 style={{ 
            fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)', 
            fontSize: '1.75rem', 
            lineHeight: 1.25, 
            color: 'var(--color-charcoal, #2B2625)', 
            margin: '0 0 1.25rem',
            fontWeight: 700
          }}>
            {welcome.title}
          </h2>

          <div style={{ width: '48px', height: '2px', background: 'var(--color-primary, #b5533c)', opacity: 0.35, margin: '0 auto 1.5rem' }} />

          <p style={{ 
            fontSize: '1.02rem', 
            lineHeight: 1.7, 
            color: 'var(--color-charcoal-light, #575251)', 
            whiteSpace: 'pre-line',
            margin: '0 0 2rem',
            textAlign: 'center'
          }}>
            {welcome.message}
          </p>

          {/* Accesos rápidos a las siguientes secciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>
              Explora el evento
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onNavigate && onNavigate('itinerary')}
                style={{ fontSize: '0.88rem', padding: '0.75rem 0.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Itinerario
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onNavigate && onNavigate('album')}
                style={{ fontSize: '0.88rem', padding: '0.75rem 0.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                Ver Fotos
              </button>
            </div>
          </div>

        </article>
      )}

    </div>
  );
}
