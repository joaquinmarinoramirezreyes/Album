import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import SinglesScreen from './SinglesScreen.jsx';
import ItineraryScreen from './ItineraryScreen.jsx';
import WelcomeModal from './WelcomeModal.jsx';
import WallScreen from './WallScreen.jsx';

function Root() {
  const [session, setSession] = useState(null); // { code, isHost }
  const [tab, setTab] = useState('album');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const onEnter = (e) => {
      setSession(e.detail);
      setTab('album');
      const seen = sessionStorage.getItem('welcome_seen_' + e.detail.code);
      if (!seen) {
        setShowWelcome(true);
      }
    };
    const onExit = () => {
      setSession(null);
      setTab('album');
      setShowWelcome(false);
    };
    const onTab = (e) => { setTab(e.detail); };
    window.addEventListener('legacy:enter', onEnter);
    window.addEventListener('legacy:exit', onExit);
    window.addEventListener('legacy:tab', onTab);
    return () => {
      window.removeEventListener('legacy:enter', onEnter);
      window.removeEventListener('legacy:exit', onExit);
      window.removeEventListener('legacy:tab', onTab);
    };
  }, []);

  const handleSetTab = (newTab) => {
    if (newTab === tab) return;
    history.pushState({ screen: 'album', tab: newTab }, '', '#' + newTab);
    setTab(newTab);
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    if (session?.code) {
      sessionStorage.setItem('welcome_seen_' + session.code, 'true');
    }
  };

  useEffect(() => {
    document.body.classList.toggle('show-itinerary', tab === 'itinerary');
    document.body.classList.toggle('show-singles', tab === 'singles');
    document.body.classList.toggle('show-wall', tab === 'wall');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab]);

  if (!session) return null;
  const tabsEl = document.getElementById('react-tabs');
  const itineraryEl = document.getElementById('react-itinerary');
  const singlesEl = document.getElementById('react-singles');
  const wallEl = document.getElementById('react-wall');

  return (
    <>
      {tabsEl && createPortal(
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Botón sutil para volver a abrir la carta de bienvenida */}
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(181, 83, 60, 0.2)',
              color: 'var(--color-primary, #b5533c)',
              borderRadius: '999px',
              padding: '4px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              margin: '-20px auto 14px'
            }}
          >
            <span>💌</span> Carta de bienvenida
          </button>

          {/* 4 Pestañas principales */}
          <nav className="tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', maxWidth: '440px', width: '92%' }}>
            {/* 1. Álbum */}
            <button type="button" className={'tabs__btn' + (tab === 'album' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('album')} style={{ padding: '0.75rem 0.25rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Álbum
            </button>
            {/* 2. Itinerario */}
            <button type="button" className={'tabs__btn' + (tab === 'itinerary' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('itinerary')} style={{ padding: '0.75rem 0.25rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Itinerario
            </button>
            {/* 3. Solteros */}
            <button type="button" className={'tabs__btn' + (tab === 'singles' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('singles')} style={{ padding: '0.75rem 0.25rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Solteros
            </button>
            {/* 4. Muro */}
            <button type="button" className={'tabs__btn' + (tab === 'wall' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('wall')} style={{ padding: '0.75rem 0.25rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Muro
            </button>
          </nav>
        </div>,
        tabsEl
      )}
      {itineraryEl && tab === 'itinerary' && createPortal(
        <ItineraryScreen eventCode={session.code} isHost={session.isHost} />,
        itineraryEl
      )}
      {singlesEl && tab === 'singles' && createPortal(
        <SinglesScreen eventCode={session.code} isHost={session.isHost} />,
        singlesEl
      )}
      {wallEl && tab === 'wall' && createPortal(
        <WallScreen eventCode={session.code} isHost={session.isHost} />,
        wallEl
      )}
      {createPortal(
        <WelcomeModal
          eventCode={session.code}
          isHost={session.isHost}
          isOpen={showWelcome}
          onClose={handleCloseWelcome}
        />,
        document.body
      )}
    </>
  );
}

const mount = document.createElement('div');
document.body.appendChild(mount);
createRoot(mount).render(<Root />);
