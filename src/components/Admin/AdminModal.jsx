import { useState } from 'react';
import { doc, setDoc, serverTimestamp, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function AdminModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [events, setEvents] = useState([]);
  
  const [newCode, setNewCode] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPin, setNewPin] = useState('');
  
  const ADMIN_PASS = '1234'; // Same as vanilla

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      setAuthenticated(true);
      fetchEvents();
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const fetchEvents = async () => {
    const snap = await getDocs(collection(db, 'eventos_activos'));
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCode || !newDate) return;
    
    const code = newCode.toUpperCase().trim().replace(/\s+/g, '');
    try {
      await setDoc(doc(db, 'eventos_activos', code), {
        creadoEn: serverTimestamp(),
        activo: true,
        fechaEvento: newDate,
        adminPin: newPin.trim() || null
      });
      setNewCode('');
      setNewDate('');
      setNewPin('');
      fetchEvents();
      alert(`Evento ${code} creado exitosamente`);
    } catch (err) {
      console.error(err);
      alert('Error creando evento');
    }
  };

  const handleDelete = async (code) => {
    if (!confirm(`¿Borrar TODO el evento ${code}?`)) return;
    
    try {
      // Borrar evento activo
      await deleteDoc(doc(db, 'eventos_activos', code));
      
      // Borrar entradas (no subcolecciones automáticamente en cliente, pero bueno)
      const snap = await getDocs(collection(db, `events/${code}/guest_entries`));
      snap.forEach(d => deleteDoc(d.ref));
      
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="lightbox">
      <div className="modal-card" style={{position: 'relative', background: '#FAFAFA'}}>
        <button onClick={onClose} className="modal-close">&times;</button>
        
        {!authenticated ? (
          <>
            <h2 className="modal-title">Acceso Admin</h2>
            <form onSubmit={handleLogin}>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="login__input" placeholder="Contraseña" required />
              <button type="submit" className="btn btn--primary btn--full mt-4">Entrar</button>
            </form>
          </>
        ) : (
          <>
            <h2 className="modal-title">Panel de Control</h2>
            <form onSubmit={handleCreate} className="mt-4">
              <p className="modal-subtitle">Crear Nuevo Evento</p>
              <input type="text" className="login__input" value={newCode} onChange={e=>setNewCode(e.target.value)} placeholder="Código" required />
              <input type="date" className="login__input mt-2" value={newDate} onChange={e=>setNewDate(e.target.value)} required />
              <input type="text" className="login__input mt-2" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="PIN Anfitrión (Opcional)" />
              <button type="submit" className="btn btn--primary btn--full mt-2">Crear Evento</button>
            </form>
            
            <hr style={{margin: '20px 0'}} />
            <p className="modal-subtitle">Eventos Activos</p>
            <ul className="admin-list" style={{listStyle: 'none', padding: 0}}>
              {events.map(ev => (
                <li key={ev.id} style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', background:'#eee', padding:'10px', borderRadius:'8px'}}>
                  <div>
                    <strong>{ev.id}</strong><br/>
                    <small>{ev.fechaEvento}</small>
                  </div>
                  <button onClick={() => handleDelete(ev.id)} style={{color:'red'}}>Borrar</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
