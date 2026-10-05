import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import SinglesScreen from './SinglesScreen.jsx';

// El álbum original (index.html + app.js) se queda intacto.
// React solo maneja las piezas nuevas: pestañas y Solteros.
function Root() {
  const [session, setSession] = useState(null); // { code, isHost }
  const [tab, setTab] = useState('album');

  useEffect(() => {
    const onEnter = (e) => { setSession(e.detail); setTab('album'); };
    const onExit = () => { setSession(null); setTab('album'); };
    window.addEventListener('legacy:enter', onEnter);
    window.addEventListener('legacy:exit', onExit);
    return () => {
      window.removeEventListener('legacy:enter', onEnter);
      window.removeEventListener('legacy:exit', onExit);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('show-singles', tab === 'singles');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab]);

  if (!session) return null;
  const tabsEl = document.getElementById('react-tabs');
  const singlesEl = document.getElementById('react-singles');

  return (
    <>
      {tabsEl && createPortal(
        <nav className="tabs">
          <button type="button" className={'tabs__btn' + (tab === 'album' ? ' tabs__btn--active' : '')} onClick={() => setTab('album')}>📸 Álbum</button>
          <button type="button" className={'tabs__btn' + (tab === 'singles' ? ' tabs__btn--active' : '')} onClick={() => setTab('singles')}>💘 Solteros</button>
        </nav>,
        tabsEl
      )}
      {singlesEl && tab === 'singles' && createPortal(
        <SinglesScreen eventCode={session.code} isHost={session.isHost} />,
        singlesEl
      )}
    </>
  );
}

const mount = document.createElement('div');
document.body.appendChild(mount);
createRoot(mount).render(<Root />);
