import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc, updateDoc, increment
} from 'firebase/firestore';

const getDb = () => getFirestore(getApp());

// Generador de color de avatar según el nombre
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

export default function WallScreen({ eventCode, isHost }) {
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

  // Escuchar publicaciones en tiempo real
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

  // Publicar nuevo mensaje
  const handlePublish = async (e) => {
    e.preventDefault();
    const cleanName = authorName.trim();
    const cleanContent = content.trim();

    if (!cleanName) {
      alert('Por favor escribe tu nombre.');
      return;
    }
    if (!cleanContent) {
      alert('Por favor escribe un mensaje o felicitación.');
      return;
    }

    setPublishing(true);
    try {
      localStorage.setItem('guest_name', cleanName);
      await addDoc(collection(getDb(), 'events', eventCode, 'wall_posts'), {
        author: cleanName,
        message: cleanContent,
        likes: 0,
        timestamp: serverTimestamp(),
      });
      setContent('');
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
    <div className="wall-container" style={{ padding: '0.5rem 1rem 3.5rem', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Encabezado del Muro */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)',
          fontSize: '1.65rem',
          margin: '0 0 0.35rem',
          color: 'var(--color-charcoal, #2b2625)',
          fontWeight: 700
        }}>
          Muro de la Boda
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
          Deja tus buenos deseos, felicitaciones y anécdotas para los anfitriones
        </p>
      </div>

      {/* Caja de publicación tipo Facebook */}
      <div 
        className="wall-create-card"
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          marginBottom: '2rem'
        }}
      >
        <form onSubmit={handlePublish}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.85rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: authorName ? getAvatarColor(authorName) : '#b5533c',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              flexShrink: 0
            }}>
              {authorName ? getInitials(authorName) : '✍️'}
            </div>
            <input
              type="text"
              placeholder="Tu nombre (ej. Tía Carmen, Juan Pérez)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={50}
              className="form-input"
              style={{
                borderRadius: '12px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.9rem',
                background: '#f8f8f9'
              }}
            />
          </div>

          <textarea
            rows={3}
            placeholder="¿Qué les quieres decir a los novios hoy? 🎉..."
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
              marginBottom: '0.85rem'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#999' }}>
              {content.length}/500 caracteres
            </span>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={publishing || !content.trim() || !authorName.trim()}
              style={{
                padding: '0.65rem 1.4rem',
                fontSize: '0.9rem',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {publishing ? 'Publicando...' : (
                <>
                  <span>Publicar</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feed de Publicaciones */}
      <div className="wall-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '20px',
            color: '#777'
          }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>💌</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem', color: '#333' }}>
              El muro está esperando su primer mensaje
            </p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              ¡Sé el primero en dedicarles unas palabras!
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
                  borderRadius: '18px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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

                {/* Contenido del Post */}
                <p style={{
                  fontSize: '0.98rem',
                  lineHeight: '1.55',
                  color: '#333333',
                  margin: '0 0 1rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {post.message}
                </p>

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
