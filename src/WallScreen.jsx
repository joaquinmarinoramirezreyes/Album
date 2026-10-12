import React, { useState, useEffect, useRef } from 'react';
import { getEventType } from './eventTypes.js';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc, setDoc, updateDoc, increment
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

// Compresión de imagen para portadas, avatares y fotos de publicaciones
function compressImage(file, maxWidth = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Colores de avatares para invitados
const AVATAR_COLORS = [
  '#b5533c', '#d97736', '#3b7a57', '#4a6fa5', '#7b4b94', '#b85d19', '#2e6b66', '#a13d63'
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.trim()[0] || '?').toUpperCase();
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Hace un momento';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Hace unos segundos';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function WallScreen({ eventCode, isHost, type }) {
  const cfg = getEventType(type);

  // Estado del Perfil tipo Facebook (Portada, Foto de Perfil, Nombres, Bio)
  const [profile, setProfile] = useState({
    coverUrl: '',
    avatarUrl: '',
    names: cfg.wallNames,
    bio: cfg.wallBio,
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ names: '', bio: '' });

  // Inputs ocultos para subida de imágenes de portada y perfil
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Input para foto en la publicación del invitado
  const postPhotoInputRef = useRef(null);
  const [postPhoto, setPostPhoto] = useState(null); // base64 preview
  const [processingPhoto, setProcessingPhoto] = useState(false);

  // Estado de publicaciones
  const [posts, setPosts] = useState([]);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('guest_name') || '');
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [likedPosts, setLikedPosts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('liked_wall_posts') || '[]');
    } catch {
      return [];
    }
  });

  // 1. Escuchar datos del perfil de los anfitriones
  useEffect(() => {
    if (!eventCode) return;
    const profileRef = doc(getDb(), 'events', eventCode, 'wall_profile', 'info');
    const unsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          coverUrl: data.coverUrl || '',
          avatarUrl: data.avatarUrl || '',
          names: data.names || cfg.wallNames,
          bio: data.bio ?? cfg.wallBio,
        });
      }
    }, (err) => {
      console.warn('Error al cargar perfil del muro:', err);
    });

    return () => unsub();
  }, [eventCode, cfg]);

  // 2. Escuchar publicaciones en tiempo real
  useEffect(() => {
    if (!eventCode) return;
    const q = query(
      collection(getDb(), 'events', eventCode, 'wall_posts'),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setPosts(docs);
    }, (err) => {
      console.warn('Error al cargar posts del muro:', err);
    });

    return () => unsub();
  }, [eventCode]);

  // Manejar cambio de Foto de Portada
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const base64 = await compressImage(file, 1000, 0.72);
      const profileRef = doc(getDb(), 'events', eventCode, 'wall_profile', 'info');
      await setDoc(profileRef, {
        coverUrl: base64,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error al subir portada:', err);
      alert('Error al procesar la foto de portada.');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Manejar cambio de Foto de Perfil
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const base64 = await compressImage(file, 450, 0.75);
      const profileRef = doc(getDb(), 'events', eventCode, 'wall_profile', 'info');
      await setDoc(profileRef, {
        avatarUrl: base64,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error al subir avatar:', err);
      alert('Error al procesar la foto de perfil.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Guardar nombres / bio de los anfitriones
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const profileRef = doc(getDb(), 'events', eventCode, 'wall_profile', 'info');
      await setDoc(profileRef, {
        names: profileForm.names.trim() || cfg.wallNames,
        bio: profileForm.bio.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setEditingProfile(false);
    } catch (err) {
      console.error('Error al guardar datos del perfil:', err);
      alert('Error al guardar datos.');
    }
  };

  // Procesar foto adjunta al post del invitado
  const handlePostPhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingPhoto(true);
    try {
      const base64 = await compressImage(file, 800, 0.7);
      setPostPhoto(base64);
    } catch (err) {
      console.error('Error al procesar la foto para el post:', err);
      alert('No se pudo procesar la foto. Intenta con otra.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  // Publicar nuevo mensaje de invitado (con foto opcional)
  const handlePublish = async (e) => {
    e.preventDefault();
    const cleanName = authorName.trim();
    const cleanContent = content.trim();

    if (!cleanName) {
      alert('Por favor escribe tu nombre.');
      return;
    }
    if (!cleanContent) {
      alert('Por favor cuéntanos tu momento favorito.');
      return;
    }

    setPublishing(true);
    try {
      localStorage.setItem('guest_name', cleanName);
      const newPostData = {
        author: cleanName,
        message: cleanContent,
        likes: 0,
        timestamp: serverTimestamp(),
      };
      if (postPhoto) {
        newPostData.photoUrl = postPhoto;
      }
      await addDoc(collection(getDb(), 'events', eventCode, 'wall_posts'), newPostData);
      setContent('');
      setPostPhoto(null);
      if (postPhotoInputRef.current) postPhotoInputRef.current.value = '';
    } catch (err) {
      console.error('Error al publicar post en el muro:', err);
      alert('Hubo un error al publicar. Intenta nuevamente.');
    } finally {
      setPublishing(false);
    }
  };

  // Reacción / Like
  const handleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    const isLiked = likedPosts.includes(postId);

    try {
      const postRef = doc(getDb(), 'events', eventCode, 'wall_posts', postId);
      await updateDoc(postRef, {
        likes: increment(isLiked ? -1 : 1),
      });

      const nextLikes = isLiked
        ? likedPosts.filter((id) => id !== postId)
        : [...likedPosts, postId];

      setLikedPosts(nextLikes);
      localStorage.setItem('liked_wall_posts', JSON.stringify(nextLikes));
    } catch (err) {
      console.error('Error al reaccionar:', err);
    }
  };

  // Borrar post (Modo anfitrión)
  const handleDeletePost = async (postId) => {
    if (!confirm('¿Deseas eliminar permanentemente esta publicación del muro?')) return;
    try {
      await deleteDoc(doc(getDb(), 'events', eventCode, 'wall_posts', postId));
    } catch (err) {
      console.error('Error al eliminar post:', err);
      alert('Error al eliminar la publicación.');
    }
  };

  return (
    <div className="wall-container" style={{ padding: '0 0.75rem 4rem', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Inputs ocultos para subir portada y avatar */}
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Input oculto para foto de la publicación del invitado */}
      <input
        type="file"
        ref={postPhotoInputRef}
        onChange={handlePostPhotoSelected}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* ══════════════════════════════════════════════════
          ENCABEZADO TIPO PERFIL DE FACEBOOK
          ══════════════════════════════════════════════════ */}
      <div 
        className="fb-profile-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          marginBottom: '1.5rem',
          position: 'relative'
        }}
      >
        {/* 1. Foto de Portada */}
        <div 
          style={{
            height: '180px',
            width: '100%',
            position: 'relative',
            background: profile.coverUrl
              ? `url("${profile.coverUrl}") center center / cover no-repeat`
              : 'linear-gradient(135deg, #b5533c 0%, #d97736 50%, #f4a261 100%)',
            transition: 'background 0.3s ease'
          }}
        >
          {/* Botón cambiar portada (Anfitrión) */}
          {isHost && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              {uploadingCover ? 'Subiendo...' : 'Cambiar portada'}
            </button>
          )}
        </div>

        {/* 2. Avatar de Perfil y Datos */}
        <div style={{ padding: '0 1.25rem 1.5rem', textAlign: 'center', position: 'relative' }}>
          
          {/* Contenedor del Avatar (Sobrepuesto a la portada) */}
          <div style={{ position: 'relative', display: 'inline-block', marginTop: '-55px', marginBottom: '0.75rem' }}>
            <div 
              style={{
                width: '105px',
                height: '105px',
                borderRadius: '50%',
                border: '4px solid #FFFFFF',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                background: profile.avatarUrl
                  ? `url("${profile.avatarUrl}") center center / cover no-repeat`
                  : 'linear-gradient(135deg, #f8f1ec 0%, #edd8cb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {!profile.avatarUrl && (
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #b5533c)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </div>

            {/* Botón camarita para cambiar foto de perfil (Anfitrión) */}
            {isHost && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Cambiar foto de perfil"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: 'var(--color-primary, #b5533c)',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </button>
            )}
          </div>

          {/* Nombres y Bio */}
          {!editingProfile ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  margin: '0',
                  color: 'var(--color-charcoal, #2b2625)'
                }}>
                  {profile.names}
                </h3>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileForm({ names: profile.names, bio: profile.bio });
                      setEditingProfile(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary, #b5533c)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'inline-flex'
                    }}
                    title="Editar nombres y biografía"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                )}
              </div>
              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                margin: '0.4rem 0 0',
                lineHeight: '1.45',
                whiteSpace: 'pre-line'
              }}>
                {profile.bio}
              </p>
            </div>
          ) : (
            /* Formulario para editar Nombres y Bio (Anfitrión) */
            <form onSubmit={handleSaveProfile} style={{ textAlign: 'left', marginTop: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Nombre del perfil (ej. festejados)</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.names}
                  onChange={(e) => setProfileForm({ ...profileForm, names: e.target.value })}
                  maxLength={50}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Frase / Biografía</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  maxLength={120}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn--primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                  Guardar
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setEditingProfile(false)} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CAJA DINÁMICA: "Lo que más me gustó fue..." + Foto
          ══════════════════════════════════════════════════ */}
      <div 
        className="wall-create-card"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '22px',
          padding: '1.35rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(181, 83, 60, 0.12)',
          marginBottom: '1.75rem'
        }}
      >
        {/* Pregunta detonadora destacada */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary, #b5533c)', flexShrink: 0 }}>
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path>
          </svg>
          <h4 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-primary, #b5533c)',
            letterSpacing: '-0.01em'
          }}>
            {cfg.wallPrompt || '¿Qué fue lo que más te gustó?'}
          </h4>
        </div>

        <form onSubmit={handlePublish}>
          {/* Identificación del invitado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.85rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: authorName ? getAvatarColor(authorName) : '#b5533c',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.88rem',
              flexShrink: 0
            }}>
              {authorName ? getInitials(authorName) : '✍️'}
            </div>
            <input
              type="text"
              placeholder="Tu nombre (ej. Carlos, Tía Vero)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={50}
              className="form-input"
              style={{
                borderRadius: '12px',
                padding: '0.55rem 0.85rem',
                fontSize: '0.9rem',
                background: '#f8f8f9'
              }}
            />
          </div>

          {/* Mensaje / Respuesta */}
          <textarea
            rows={3}
            placeholder={cfg.wallPlaceholder || 'Cuéntanos tu momento favorito...'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            className="form-input"
            style={{
              width: '100%',
              borderRadius: '14px',
              padding: '0.85rem',
              fontSize: '0.95rem',
              lineHeight: '1.45',
              background: '#fbfbfb',
              resize: 'none',
              marginBottom: '0.65rem'
            }}
          />

          {/* Vista previa de foto adjunta si seleccionó una */}
          {postPhoto && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.85rem' }}>
              <img 
                src={postPhoto} 
                alt="Vista previa" 
                style={{ 
                  maxHeight: '160px', 
                  borderRadius: '14px', 
                  border: '2px solid var(--color-primary, #b5533c)',
                  objectFit: 'cover',
                  display: 'block'
                }} 
              />
              <button
                type="button"
                onClick={() => {
                  setPostPhoto(null);
                  if (postPhotoInputRef.current) postPhotoInputRef.current.value = '';
                }}
                title="Quitar foto"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#d32f2f',
                  color: '#fff',
                  border: '2px solid #fff',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Barra inferior de acciones: Botón de foto + Contador + Publicar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            
            {/* Botón para adjuntar foto */}
            <button
              type="button"
              onClick={() => postPhotoInputRef.current?.click()}
              disabled={processingPhoto || publishing}
              style={{
                background: postPhoto ? 'rgba(181, 83, 60, 0.12)' : '#f4f4f6',
                border: postPhoto ? '1px solid var(--color-primary, #b5533c)' : '1px solid #e0e0e0',
                color: postPhoto ? 'var(--color-primary, #b5533c)' : '#555',
                padding: '0.45rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>{processingPhoto ? 'Cargando...' : postPhoto ? 'Foto adjunta ✓' : 'Agregar foto'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#999' }}>
                {content.length}/500
              </span>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={publishing || processingPhoto || !content.trim() || !authorName.trim()}
                style={{
                  padding: '0.55rem 1.3rem',
                  fontSize: '0.88rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {publishing ? 'Publicando...' : (
                  <>
                    <span>Compartir</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════════════════
          FEED DE MOMENTOS COMPARTIDOS
          ══════════════════════════════════════════════════ */}
      <div className="wall-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '20px',
            color: '#777'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(181, 83, 60, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.85rem',
              color: 'var(--color-primary, #b5533c)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem', color: '#333' }}>
              El muro está esperando su primer momento favorito
            </p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              ¡Sé el primero en compartir qué fue lo que más te gustó!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = likedPosts.includes(post.id);
            const likesCount = post.likes || 0;

            return (
              <article
                key={post.id}
                className="wall-post-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Header del Post */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: getAvatarColor(post.author || 'Invitado'),
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {getInitials(post.author || 'Invitado')}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-charcoal, #2b2625)' }}>
                        {post.author || 'Invitado'}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        {formatRelativeTime(post.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Botón borrar para moderación (Anfitrión) */}
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      title="Eliminar publicación"
                      style={{
                        background: 'rgba(181, 83, 60, 0.1)',
                        border: 'none',
                        color: 'var(--color-primary, #b5533c)',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Contenido de texto del Post */}
                <p style={{
                  fontSize: '0.98rem',
                  lineHeight: '1.55',
                  color: '#2b2625',
                  margin: '0 0 0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {post.message}
                </p>

                {/* Foto adjunta del momento si la tiene */}
                {post.photoUrl && (
                  <div style={{ marginBottom: '1rem', borderRadius: '16px', overflow: 'hidden', background: '#f5f5f5' }}>
                    <img 
                      src={post.photoUrl} 
                      alt="Momento compartido" 
                      loading="lazy"
                      style={{ 
                        width: '100%', 
                        maxHeight: '380px', 
                        objectFit: 'cover', 
                        display: 'block' 
                      }} 
                    />
                  </div>
                )}

                {/* Footer del Post (Reacción tipo like) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(0, 0, 0, 0.05)'
                }}>
                  <button
                    type="button"
                    onClick={(e) => handleLike(post.id, e)}
                    style={{
                      background: isLiked ? 'rgba(181, 83, 60, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '0.4rem 0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: isLiked ? 'var(--color-primary, #b5533c)' : '#666',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={isLiked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{isLiked ? 'Te gusta' : 'Me gusta'}</span>
                    {likesCount > 0 && (
                      <span style={{
                        background: isLiked ? 'var(--color-primary, #b5533c)' : '#e5e5ea',
                        color: isLiked ? '#fff' : '#444',
                        borderRadius: '999px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {likesCount}
                      </span>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

    </div>
  );
}
