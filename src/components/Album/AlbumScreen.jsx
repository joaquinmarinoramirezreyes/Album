import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { compressImage } from '../../utils/imageUtils';

export default function AlbumScreen({ eventCode, isHost }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!eventCode) return;
    const q = query(collection(db, `events/${eventCode}/guest_entries`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [eventCode]);

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await compressImage(file, 1000);
      await addDoc(collection(db, `events/${eventCode}/guest_entries`), {
        imageUrl: base64,
        timestamp: serverTimestamp(),
        likes: 0
      });
    } catch (err) {
      console.error(err);
      alert('Error al subir foto');
    }
    setLoading(false);
  };

  const handleLike = async (id) => {
    try {
      await updateDoc(doc(db, `events/${eventCode}/guest_entries`, id), {
        likes: increment(1)
      });
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Borrar foto?')) return;
    try {
      await deleteDoc(doc(db, `events/${eventCode}/guest_entries`, id));
    } catch (err) {}
  };

  return (
    <div style={{padding: '20px', paddingBottom: '100px'}}>
      {loading && <div style={{textAlign:'center', padding:'20px'}}>Subiendo foto...</div>}
      
      <div className="gallery-grid" style={{display:'grid', gap:'20px', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))'}}>
        {entries.map(ent => (
          <div key={ent.id} className="polaroid">
             {isHost && (
              <button 
                onClick={() => handleDelete(ent.id)}
                style={{position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', color: '#B5533C', borderRadius: '50%', width: 34, height: 34, border: '1px solid rgba(181,83,60,0.3)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
              </button>
            )}
            <div className="polaroid__photo-container">
              <img src={ent.imageUrl} className="polaroid__img" alt="Foto" />
            </div>
            <div className="polaroid__bottom">
              <button className="polaroid__btn-like" onClick={() => handleLike(ent.id)}>
                🤍 <span>{ent.likes || 0}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="fab fab--photo" onClick={() => fileInputRef.current?.click()}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
      </button>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} style={{display:'none'}} />
    </div>
  );
}
