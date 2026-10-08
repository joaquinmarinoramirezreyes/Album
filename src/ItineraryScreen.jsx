import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc,
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

const getIcon = (type) => {
  switch (type) {
    case 'ceremony':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M9 12l2 2 4-4"/></svg>; // Check / rings substitute (cleaner)
    case 'food':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>;
    case 'party':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><path d="M9 18c0 1.66-2.24 3-5 3s-5-1.34-5-3 2.24-3 5-3 5 1.34 5 3Z"/><path d="M21 16c0 1.66-2.24 3-5 3s-5-1.34-5-3 2.24-3 5-3 5 1.34 5 3Z"/></svg>;
    case 'photo':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
    case 'toast':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 15v7"/><path d="M12 15a8 8 0 0 0 8-8V3H4v4a8 8 0 0 0 8 8Z"/><path d="M4 7h16"/></svg>;
    default:
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  }
};

export default function ItineraryScreen({ eventCode, isHost }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const EMPTY = { time: '', title: '', desc: '', type: 'general' };
  const [form, setForm] = useState(EMPTY);

  const valid = form.time.trim() && form.title.trim() && form.desc.trim();

  useEffect(() => {
    if (!eventCode) return;
    const q = query(collection(getDb(), 'events', eventCode, 'itinerary'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [eventCode]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(getDb(), 'events', eventCode, 'itinerary'), {
        time: form.time.trim(),
        title: form.title.trim(),
        desc: form.desc.trim(),
        type: form.type,
        timestamp: serverTimestamp(),
      });
      setForm(EMPTY);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('¿Borrar esta actividad del itinerario?')) return;
    try { await deleteDoc(doc(getDb(), 'events', eventCode, 'itinerary', id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="itinerary-container">
      <h2 className="gallery__heading" style={{ textAlign: 'center' }}>Itinerario de Bodas</h2>
      <p style={{ textAlign: 'center', opacity: 0.8, marginBottom: '2rem' }}>Acompáñanos en cada momento de nuestro gran día.</p>
      
      {isHost && !showForm && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
            + Agregar actividad
          </button>
        </div>
      )}

      {showForm && (
        <div className="upload singles-form-container" style={{ marginBottom: '2rem' }}>
          <form className="upload__form" onSubmit={submit} noValidate>
            
            <div className="form-group">
              <label className="form-label">Icono / Categoría</label>
              <select className="form-input" value={form.type} onChange={set('type')}>
                <option value="general">🕛 General / Horario</option>
                <option value="ceremony">💍 Ceremonia / Votos</option>
                <option value="food">🍽️ Comida / Banquete</option>
                <option value="toast">🥂 Brindis / Cocteles</option>
                <option value="party">🎵 Fiesta / Baile</option>
                <option value="photo">📷 Sesión de fotos</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hora</label>
              <input className="form-input" placeholder="Ej. 4:00 PM" value={form.time} onChange={set('time')} maxLength={20} />
            </div>
            <div className="form-group">
              <label className="form-label">Actividad</label>
              <input className="form-input" placeholder="Ej. Ceremonia Civil" value={form.title} onChange={set('title')} maxLength={40} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" placeholder="Ej. ¡El momento más esperado!" value={form.desc} onChange={set('desc')} maxLength={80} />
            </div>
            
            <button type="submit" className="btn btn--primary btn--full" disabled={!valid || saving}>
              {saving ? 'Guardando...' : 'Guardar actividad'}
            </button>
            <button type="button" className="btn btn--secondary btn--full" style={{ marginTop: '10px' }} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {events.length === 0 && !showForm && (
        <p style={{ textAlign: 'center', opacity: 0.6 }}>Aún no hay actividades programadas.</p>
      )}

      <div className="itinerary-timeline">
        {events.map((ev) => (
          <div key={ev.id} className="itinerary-item">
            <div className="itinerary-icon">
              {getIcon(ev.type || 'general')}
            </div>
            <span className="itinerary-time">{ev.time}</span>
            <h3 className="itinerary-title">{ev.title}</h3>
            <p className="itinerary-desc">{ev.desc}</p>
            {isHost && (
              <button 
                type="button" 
                onClick={() => remove(ev.id)}
                style={{ 
                  position: 'absolute', right: 0, top: 0, 
                  background: 'rgba(200,0,0,0.1)', color: 'red', 
                  border: 'none', borderRadius: '4px', padding: '4px 8px',
                  cursor: 'pointer', zIndex: 10
                }}
              >
                Borrar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
