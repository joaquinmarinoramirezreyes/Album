import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import SinglesScreen from './SinglesScreen.jsx';
import ItineraryScreen from './ItineraryScreen.jsx';
import WelcomeModal from './WelcomeModal.jsx';
import WallScreen from './WallScreen.jsx';
import SurvivalModal, { SurvivalPillButton } from './SurvivalModal.jsx';
import SurvivalScreen from './SurvivalScreen.jsx';
import { getEventType, DEFAULT_EVENT_TYPE } from './eventTypes.js';

const getDb = () => getFirestore(getApp());

// Definición de cada pestaña posible (etiqueta + ícono). Qué pestañas se ven lo decide el tipo de evento.
const TAB_DEFS = {
  album: {
    label: 'Álbum',
    icon: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></>,
  },
  itinerary: {
    label: 'Itinerario',
    icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>,
  },
  singles: {
    label: 'Solteros',
    icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>,
  },
  wall: {
    label: 'Muro',
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>,
  },
  survival: {
    label: 'Bóveda',
    icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></>,
  },
};

function Root() {
  const [session, setSession] = useState(null); // { code, isHost, type }
  const [tab, setTab] = useState('itinerary');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSurvival, setShowSurvival] = useState(false);
  const [survivalConfig, setSurvivalConfig] = useState(null);

  const typeConfig = getEventType(session?.type || DEFAULT_EVENT_TYPE);
  const hasSurvival = Boolean(typeConfig.hasSurvival);

  // Escuchar configuración de supervivencia para saber si la bóveda ya fue revelada
  useEffect(() => {
    if (!session?.code || !hasSurvival) {
      setSurvivalConfig(null);
      return;
    }
    const unsub = onSnapshot(doc(getDb(), 'events', session.code, 'survival', 'config'), (snap) => {
      if (snap.exists()) {
        setSurvivalConfig(snap.data());
      } else {
        setSurvivalConfig(null);
      }
    });
    return () => unsub();
  }, [session?.code, hasSurvival]);

  // Reloj para que la pestaña aparezca sola en cuanto llega la hora de revelación
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (!survivalConfig?.revealAt) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [survivalConfig?.revealAt]);

  const isSurvivalRevealed = Boolean(
    survivalConfig?.revealAt && nowTick >= survivalConfig.revealAt
  );

  // Pestaña oculta: La 'Bóveda' solo se desbloquea en la barra cuando se abre la bóveda
  const tabs = (hasSurvival && isSurvivalRevealed)
    ? [...typeConfig.tabs, 'survival']
    : typeConfig.tabs;

  useEffect(() => {
    const onEnter = (e) => {
      setSession(e.detail);
      setTab(getEventType(e.detail.type).tabs[0]);
      const seen = sessionStorage.getItem('welcome_seen_' + e.detail.code);
      if (!seen) {
        setShowWelcome(true);
      }
    };
    const onExit = () => {
      setSession(null);
      setTab('itinerary');
      setShowWelcome(false);
      setShowSurvival(false);
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

  // Si la pestaña activa no existe en este tipo de evento, vuelve a la primera.
  useEffect(() => {
    if (session && !tabs.includes(tab)) setTab(tabs[0]);
  }, [session, tab, tabs]);

  const handleSetTab = (newTab) => {
    if (newTab === tab || !tabs.includes(newTab)) return;
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
    document.body.classList.toggle('show-survival', tab === 'survival');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab]);

  if (!session) return null;
  const tabsEl = document.getElementById('react-tabs');
  const itineraryEl = document.getElementById('react-itinerary');
  const singlesEl = document.getElementById('react-singles');
  const wallEl = document.getElementById('react-wall');
  const survivalEl = document.getElementById('react-survival');

  return (
    <>
      {tabsEl && createPortal(
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Botón sutil para volver a abrir la carta de bienvenida */}
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
              color: 'var(--color-primary)',
              borderRadius: '999px',
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              margin: '0 auto 16px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>Carta de bienvenida</span>
          </button>

          {/* Pestañas según el tipo de evento */}
          <nav className="tabs" style={{ maxWidth: tabs.length >= 5 ? '490px' : '440px', width: '94%', margin: '0 auto 28px' }}>
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                className={'tabs__btn' + (tab === key ? ' tabs__btn--active' : '')}
                onClick={() => handleSetTab(key)}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ verticalAlign: 'text-bottom', marginRight: '2px', flexShrink: 0 }}>
                  {TAB_DEFS[key].icon}
                </svg> {TAB_DEFS[key].label}
              </button>
            ))}
          </nav>
        </div>,
        tabsEl
      )}
      {itineraryEl && tab === 'itinerary' && createPortal(
        <ItineraryScreen eventCode={session.code} isHost={session.isHost} type={session.type} />,
        itineraryEl
      )}
      {singlesEl && tab === 'singles' && createPortal(
        <SinglesScreen eventCode={session.code} isHost={session.isHost} type={session.type} />,
        singlesEl
      )}
      {wallEl && tab === 'wall' && createPortal(
        <WallScreen eventCode={session.code} isHost={session.isHost} type={session.type} />,
        wallEl
      )}
      {survivalEl && tab === 'survival' && createPortal(
        <SurvivalScreen eventCode={session.code} isHost={session.isHost} type={session.type} themeKey={session.theme} />,
        survivalEl
      )}
      {createPortal(
        <WelcomeModal
          eventCode={session.code}
          isHost={session.isHost}
          type={session.type}
          isOpen={showWelcome}
          onClose={handleCloseWelcome}
        />,
        document.body
      )}
      {hasSurvival && tab !== 'survival' && createPortal(
        <SurvivalPillButton
          eventCode={session.code}
          isHost={session.isHost}
          themeKey={session.theme}
          onClick={() => setShowSurvival(true)}
          onOpenVault={() => handleSetTab('survival')}
        />,
        document.body
      )}
      {hasSurvival && createPortal(
        <SurvivalModal
          eventCode={session.code}
          isHost={session.isHost}
          type={session.type}
          themeKey={session.theme}
          isOpen={showSurvival}
          onClose={() => setShowSurvival(false)}
        />,
        document.body
      )}
    </>
  );
}

const mount = document.createElement('div');
document.body.appendChild(mount);
createRoot(mount).render(<Root />);
