import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc,
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

export default function ItineraryScreen({ eventCode, isHost }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const EMPTY = { time: '', title: '', desc: '' };
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
                  cursor: 'pointer'
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
