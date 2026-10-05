const fs = require('fs');
const path = require('path');

const write = (file, content) => {
  const fullPath = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
};

write('src/utils/imageUtils.js', 
export function compressImage(file, maxWidth = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.floor((maxWidth * height) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
);

write('src/components/LoginScreen.jsx', 
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
          {error && <small className="login__hint mt-2">Datos incorrectos.</small>}
          <button type="submit" className="btn btn--primary login__btn" disabled={loading}>
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
);

console.log('Login generated');
