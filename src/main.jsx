import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import SinglesScreen from './SinglesScreen.jsx';
import ItineraryScreen from './ItineraryScreen.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';

function Root() {
  const [session, setSession] = useState(null); // { code, isHost }
  const [tab, setTab] = useState('welcome');

  useEffect(() => {
    const onEnter = (e) => { setSession(e.detail); setTab('welcome'); };
    const onExit = () => { setSession(null); setTab('welcome'); };
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

  useEffect(() => {
    document.body.classList.toggle('show-welcome', tab === 'welcome');
    document.body.classList.toggle('show-itinerary', tab === 'itinerary');
    document.body.classList.toggle('show-singles', tab === 'singles');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab]);

  if (!session) return null;
  const tabsEl = document.getElementById('react-tabs');
  const welcomeEl = document.getElementById('react-welcome');
  const itineraryEl = document.getElementById('react-itinerary');
  const singlesEl = document.getElementById('react-singles');

  return (
    <>
      {tabsEl && createPortal(
        <nav className="tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', maxWidth: '440px', width: '92%' }}>
          {/* 1. Bienvenida */}
          <button type="button" className={'tabs__btn' + (tab === 'welcome' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('welcome')} style={{ padding: '0.75rem 0.15rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Inicio
          </button>
          {/* 2. Itinerario */}
          <button type="button" className={'tabs__btn' + (tab === 'itinerary' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('itinerary')} style={{ padding: '0.75rem 0.15rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Itinerario
          </button>
          {/* 3. Solteros */}
          <button type="button" className={'tabs__btn' + (tab === 'singles' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('singles')} style={{ padding: '0.75rem 0.15rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Solteros
          </button>
          {/* 4. Álbum */}
          <button type="button" className={'tabs__btn' + (tab === 'album' ? ' tabs__btn--active' : '')} onClick={() => handleSetTab('album')} style={{ padding: '0.75rem 0.15rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"text-bottom", marginRight:"3px"}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Álbum
          </button>
        </nav>,
        tabsEl
      )}
      {welcomeEl && tab === 'welcome' && createPortal(
        <WelcomeScreen eventCode={session.code} isHost={session.isHost} onNavigate={handleSetTab} />,
        welcomeEl
      )}
      {itineraryEl && tab === 'itinerary' && createPortal(
        <ItineraryScreen eventCode={session.code} isHost={session.isHost} />,
        itineraryEl
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
