import { useEffect, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc,
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

function compressImage(file, maxWidth = 900, quality = 0.7) {
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
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const EMPTY = { name: '', age: '', profession: '', side: 'la Novia', funFact: '' };

export default function SinglesScreen({ eventCode, isHost }) {
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const q = query(collection(getDb(), 'events', eventCode, 'singles'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [eventCode]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(await compressImage(file));
  };

  const valid = photo && form.name.trim() && form.age.trim() && form.profession.trim() && form.funFact.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await addDoc(collection(getDb(), 'events', eventCode, 'singles'), {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])),
        photoUrl: photo,
        timestamp: serverTimestamp(),
      });
      setForm(EMPTY);
      setPhoto(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar tu perfil. Intenta de nuevo.');
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('¿Borrar este perfil?')) return;
    try { await deleteDoc(doc(getDb(), 'events', eventCode, 'singles', id)); }
    catch (err) { console.error(err); }
  };

  const openLightbox = (p) => {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCap = document.getElementById('lightbox-caption');
    
    // 3D Flip elements
    const backName = document.getElementById('lightbox-back-name');
    const backMsg = document.getElementById('lightbox-back-message');
    const flipInner = document.getElementById('lightbox-flip-inner');
    const flipBtn = document.getElementById('lightbox-btn-flip');

    if (lb && lbImg) {
      lbImg.src = p.photoUrl;
      const ageStr = p.age ? `, ${p.age}` : '';
      if (lbCap) lbCap.textContent = `${p.name}${ageStr}`;
      
      if (backName) backName.textContent = `${p.name}${ageStr}`;
      if (backMsg) {
        let msg = '';
        if (p.profession) msg += `${p.profession}\n`;
        if (p.funFact) msg += `\n"${p.funFact}"\n`;
        if (p.side) msg += `\nInvitado/a de: ${p.side}`;
        backMsg.innerText = msg.trim();
      }

      // Reset flip state before opening
      if (flipInner) {
        flipInner.classList.remove('is-flipped');
        const front = flipInner.querySelector('.lightbox__flip-front');
        const back = flipInner.querySelector('.lightbox__flip-back');
        if (front) { front.removeAttribute('inert'); }
        if (back) { back.setAttribute('inert', ''); }
      }
      if (flipBtn) {
        flipBtn.setAttribute('aria-label', 'Ver descripción');
        flipBtn.classList.remove('is-flipped-state');
      }

      lb.hidden = false;
      document.body.style.overflow = 'hidden';
    }
  };

  return (
    <div className="singles">
      {!showForm ? (
        <div className="singles-form-container">
          <button type="button" className="btn btn--primary btn--full" style={{ marginBottom: '1.5rem' }} onClick={() => setShowForm(true)}>
            Anotarme como soltero(a)
          </button>
        </div>
      ) : (
        <div className="upload singles-form-container" style={{ marginBottom: '2rem' }}>
          <form className="upload__form" onSubmit={submit} noValidate>
            <div className="form-group">
              <label className="form-label">Tu foto</label>
              <input ref={fileRef} type="file" accept="image/*"  className="sr-only" onChange={onPhoto} />
              {!photo ? (
                <button type="button" className="upload__photo-btn" onClick={() => fileRef.current?.click()}>
                  <span className="upload__photo-icon" aria-hidden="true">
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </span>
                  <span>Sube una foto</span>
                </button>
              ) : (
                <div className="upload__preview">
                  <img className="upload__preview-img" src={photo} alt="Vista previa" />
                  <button type="button" className="upload__preview-remove" onClick={() => setPhoto(null)} aria-label="Quitar foto">✕</button>
                </div>
              )}
            </div>
            
            <div style={{display: 'flex', gap: '10px'}}>
              <div className="form-group" style={{flex: 2}}>
                <label className="form-label">Nombre</label>
                <input className="form-input" placeholder="Ej. Ana" value={form.name} onChange={set('name')} maxLength={40} />
              </div>
              <div className="form-group" style={{flex: 1}}>
                <label className="form-label">Edad</label>
                <input className="form-input" inputMode="numeric" placeholder="27" value={form.age} onChange={set('age')} maxLength={3} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">¿A qué te dedicas?</label>
              <input className="form-input" placeholder="Ej. Arquitecta" value={form.profession} onChange={set('profession')} maxLength={50} />
            </div>
            <div className="form-group">
              <label className="form-label">Vengo de parte de</label>
              <select className="form-input" value={form.side} onChange={set('side')}>
                <option value="la Novia">La Novia</option>
                <option value="el Novio">El Novio</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Dato curioso</label>
              <input className="form-input" placeholder="Ej. Hago el mejor guacamole" value={form.funFact} onChange={set('funFact')} maxLength={80} />
            </div>
            
            <button type="submit" className="btn btn--primary btn--full" disabled={!valid || saving}>
              {saving ? 'Guardando…' : 'Publicar mi perfil'}
            </button>
            <button type="button" className="btn btn--secondary btn--full" style={{ marginTop: '10px' }} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      <h2 className="gallery__heading">Solteros de la fiesta</h2>
      {profiles.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.6 }}>Nadie se ha anotado todavía… ¡sé el primero!</p>
      )}
      <div className="singles-grid">
        {profiles.map((p) => (
          <article key={p.id} className="single-card">
            {isHost && (
              <button type="button" className="single-card__delete" onClick={() => remove(p.id)} aria-label="Borrar perfil">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
              </button>
            )}
            <img 
              className="single-card__img" 
              src={p.photoUrl} 
              alt={p.name} 
              loading="lazy" 
              onClick={() => openLightbox(p)}
            />
            <div className="single-card__body">
              <h3 className="single-card__name">{p.name}{p.age ? `, ${p.age}` : ''}</h3>
              <p className="single-card__row">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"middle", marginRight: "4px"}}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                {p.profession}
              </p>
              <p className="single-card__fact">“{p.funFact}”</p>
              <div className="single-card__footer">
                <span>De parte de {p.side}</span>
                
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


