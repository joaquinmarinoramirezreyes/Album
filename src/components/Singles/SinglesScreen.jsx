import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { compressImage } from '../../utils/imageUtils';

export default function SinglesScreen({ eventCode, isHost }) {
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [side, setSide] = useState('Novia'); // Novia o Novio
  const [funFact, setFunFact] = useState('');
  const [table, setTable] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!eventCode) return;
    const q = query(collection(db, `events/${eventCode}/singles`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [eventCode]);

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    
    try {
      const base64 = await compressImage(file, 800);
      
      await addDoc(collection(db, `events/${eventCode}/singles`), {
        name: name.trim(),
        profession: profession.trim(),
        side,
        funFact: funFact.trim(),
        table: table.trim(),
        photoUrl: base64,
        timestamp: serverTimestamp()
      });
      
      setShowForm(false);
      setName('');
      setProfession('');
      setFunFact('');
      setTable('');
    } catch (err) {
      console.error(err);
      alert('Error al subir el perfil');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Borrar perfil?')) return;
    try {
      await deleteDoc(doc(db, `events/${eventCode}/singles`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{padding: '20px', maxWidth: '500px', margin: '0 auto'}}>
      
      {!showForm ? (
        <button 
          className="btn btn--primary btn--full mb-6" 
          onClick={() => setShowForm(true)}
          style={{boxShadow: '0 4px 15px rgba(181, 83, 60, 0.4)'}}
        >
          💘 Anotarme en la lista de solteros
        </button>
      ) : (
        <div className="login-card mb-6" style={{background: '#fff', border: '1px solid #ddd'}}>
          <h2 className="modal-title" style={{fontSize: '1.2rem', marginBottom: '15px'}}>Crear Perfil</h2>
          <input className="login__input mb-2" placeholder="Tu Nombre y Edad (Ej: Ana, 27)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="login__input mb-2" placeholder="Profesión (Ej: Arquitecta)" value={profession} onChange={e=>setProfession(e.target.value)} />
          <input className="login__input mb-2" placeholder="Dato curioso (Ej: Hago el mejor guacamole)" value={funFact} onChange={e=>setFunFact(e.target.value)} />
          <input className="login__input mb-2" placeholder="Número de Mesa (Ej: 7)" value={table} onChange={e=>setTable(e.target.value)} />
          
          <select className="login__input mb-4" value={side} onChange={e=>setSide(e.target.value)}>
            <option value="Novia">Vengo de parte de la Novia</option>
            <option value="Novio">Vengo de parte del Novio</option>
          </select>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="user" 
            ref={fileInputRef} 
            onChange={handlePhotoCapture} 
            style={{display: 'none'}} 
          />
          
          <div style={{display:'flex', gap:'10px'}}>
            <button className="btn btn--secondary" style={{flex:1}} onClick={() => setShowForm(false)}>Cancelar</button>
            <button 
              className="btn btn--primary" 
              style={{flex:1}} 
              onClick={() => fileInputRef.current?.click()}
              disabled={!name || !profession || !funFact || !table || loading}
            >
              {loading ? 'Subiendo...' : '📸 Tomar Foto y Subir'}
            </button>
          </div>
        </div>
      )}

      {/* Grid de Solteros */}
      <div style={{display: 'grid', gap: '20px', paddingBottom: '100px'}}>
        {profiles.length === 0 ? (
          <p className="text-center opacity-50">Nadie se ha registrado todavía... ¡Sé el primero!</p>
        ) : profiles.map(p => (
          <div key={p.id} className="polaroid" style={{padding: '15px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.08)'}}>
            {isHost && (
              <button 
                onClick={() => handleDelete(p.id)}
                style={{position: 'absolute', top: 10, right: 10, background: 'red', color: 'white', borderRadius: '50%', width: 30, height: 30, border: 'none'}}
              >✕</button>
            )}
            <img src={p.photoUrl} alt={p.name} style={{width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px'}} />
            <h3 style={{fontSize: '1.4rem', color: '#B5533C', fontFamily: 'Instrument Serif, serif', margin: '0 0 5px 0'}}>{p.name}</h3>
            <p style={{margin: '0 0 8px 0', fontSize: '0.9rem', color: '#555'}}>💼 {p.profession}</p>
            <p style={{margin: '0 0 8px 0', fontSize: '0.9rem', color: '#555'}}>🎲 "{p.funFact}"</p>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ddd'}}>
               <span style={{fontSize: '0.85rem', color: '#888'}}>De parte del {p.side}</span>
               <span style={{background: '#B5533C', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold'}}>🍽️ Mesa {p.table}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
