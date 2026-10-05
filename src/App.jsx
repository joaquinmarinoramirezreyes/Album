import { useState } from 'react';
import LoginScreen from './components/Login/LoginScreen';
import AdminModal from './components/Admin/AdminModal';
import SinglesScreen from './components/Singles/SinglesScreen';
import AlbumScreen from './components/Album/AlbumScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'album', 'singles'
  const [activeEventCode, setActiveEventCode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleLogin = (code, hostStatus) => {
    setActiveEventCode(code);
    setIsHost(hostStatus);
    setCurrentScreen('album');
  };

  const NavTabs = ({ current }) => (
    <div style={{display:'flex', gap:'10px', padding:'10px', background:'#B5533C', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
      <button 
        className="btn" 
        style={{flex:1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: current === 'album' ? '#fff' : 'rgba(255,255,255,0.2)', color: current === 'album' ? '#B5533C' : '#fff'}} 
        onClick={() => setCurrentScreen('album')}
      >📸 Álbum</button>
      <button 
        className="btn" 
        style={{flex:1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: current === 'singles' ? '#fff' : 'rgba(255,255,255,0.2)', color: current === 'singles' ? '#B5533C' : '#fff'}} 
        onClick={() => setCurrentScreen('singles')}
      >💘 Solteros</button>
    </div>
  );

  return (
    <>
      <main className="app-container">
        {currentScreen === 'login' && (
          <LoginScreen 
            onLogin={handleLogin} 
            openAdmin={() => setShowAdmin(true)} 
          />
        )}
        
        {currentScreen === 'album' && (
          <div className="screen screen--active" style={{overflowY: 'auto'}}>
            <NavTabs current="album" />
            <AlbumScreen eventCode={activeEventCode} isHost={isHost} />
          </div>
        )}
        
        {currentScreen === 'singles' && (
          <div className="screen screen--active" style={{overflowY: 'auto', background: '#FAFAFA'}}>
            <NavTabs current="singles" />
            <SinglesScreen eventCode={activeEventCode} isHost={isHost} />
          </div>
        )}
      </main>

      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}
    </>
  );
}
