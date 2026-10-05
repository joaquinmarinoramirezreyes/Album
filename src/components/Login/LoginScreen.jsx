import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function LoginScreen({ onLogin, openAdmin }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [hostPin, setHostPin] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError(false);
    try {
      const eventCode = code.toUpperCase().trim();
      const snap = await getDoc(doc(db, 'eventos_activos', eventCode));
      if (snap.exists()) {
        if (showHost) {
           if (snap.data().adminPin === hostPin.trim()) {
              localStorage.setItem('host_' + eventCode, 'true');
              onLogin(eventCode, true);
           } else {
              setError(true);
           }
        } else {
           localStorage.removeItem('host_' + eventCode);
           onLogin(eventCode, false);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="screen screen--active">
      <div className="login-card">
        <h1 className="login__title">Nuestro Álbum<br/>cerámico</h1>
        <form onSubmit={handleSubmit} className="login__form">
          <input 
            className="login__input" 
            placeholder="Código del evento" 
            value={code} onChange={e => setCode(e.target.value)} required 
          />
          {showHost && (
            <input 
              className="login__input mt-2" 
              type="password"
              placeholder="PIN de anfitrión" 
              value={hostPin} onChange={e => setHostPin(e.target.value)} required 
            />
          )}
          {error && <small className="login__hint mt-2" style={{display: 'block'}}>Datos incorrectos.</small>}
          <button type="submit" className="btn btn--primary login__btn" disabled={loading} style={{marginTop: '1rem'}}>
            {loading ? 'Verificando...' : (showHost ? 'Entrar como Moderador' : 'Entrar al álbum')}
          </button>
        </form>
        
        {!showHost && (
          <button type="button" className="btn--text mt-4 text-terracotta underline text-sm" onClick={() => setShowHost(true)}>
            ¿Eres el anfitrión de este evento?
          </button>
        )}
        
        <button type="button" onClick={openAdmin} className="btn--text mt-8 opacity-50">
          Admin Panel
        </button>
      </div>
    </div>
  );
}
