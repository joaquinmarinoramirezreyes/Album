# 🏺 Nuestro Álbum de Barro — Guía de Configuración Firebase

## Archivos del Proyecto

```
nuestro-album-de-barro/
├── index.html     ← HTML semántico (no requiere cambios)
├── styles.css     ← Design system terracota (no requiere cambios)
└── app.js         ← Lógica + Firebase SDK v10 modular (ESM)
```

---

## 🔧 Paso 1: Crear tu Proyecto en Firebase Console

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"** → ponle nombre (ej: `album-de-barro`)
3. Una vez creado, en el **Overview** del proyecto, clic en el ícono **Web** (`</>`) para registrar una app web
4. Copia los valores de configuración que te da Firebase

---

## 🔑 Paso 2: Pegar las Credenciales en `app.js`

Abre `app.js` y busca el bloque `firebaseConfig` (líneas ~30-37). Rellena cada campo con tus valores:

```javascript
const firebaseConfig = {
  apiKey:            'AIzaSy...',
  authDomain:        'album-de-barro.firebaseapp.com',
  projectId:         'album-de-barro',
  storageBucket:     'album-de-barro.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abc123'
};
```

---

## 🗄️ Paso 3: Habilitar Firestore

1. En Firebase Console → **Build** → **Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona ubicación (ej: `us-central1` o `southamerica-east1`)
4. **Empieza en modo de prueba** (permite lectura/escritura por 30 días)

> [!IMPORTANT]
> Antes de la boda, configura reglas de seguridad apropiadas. Ve la sección de Reglas más abajo.

### Estructura que requiere la app:

```
📁 eventos_activos (colección)
│
└── 📄 BODA2026 (documento — ID = código de acceso, en MAYÚSCULAS)
    ├── nombre: "Boda de María y Luis" (opcional, para tu control)
    └── activo: true (opcional)

📁 events (colección, se crea automáticamente al subir fotos)
│
└── 📄 BODA2026 (documento)
    │
    └── 📁 guest_entries (subcolección)
        │
        ├── 📄 {autoId}
        │   ├── nombre:      "María"
        │   ├── dedicatoria:  "¡Los quiero mucho!"
        │   ├── imageUrl:    "https://i.ibb.co/..."
        │   └── timestamp:   Timestamp (server)
```

---

## 🔒 Paso 4: Reglas de Seguridad (para producción)

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permitir leer la colección de eventos_activos para validar el login
    // Permitir create para poder crear nuevos eventos desde la UI
    // Permitir delete para que el admin pueda borrar eventos
    match /eventos_activos/{eventId} {
      allow read: if true;
      allow create: if true;
      allow delete: if true;
    }

    // Permitir leer/escribir entries dentro de cualquier evento
    match /events/{eventId}/guest_entries/{entryId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['nombre', 'imageUrl', 'timestamp'])
                    && request.resource.data.nombre is string
                    && request.resource.data.nombre.size() <= 60
                    && request.resource.data.imageUrl is string
                    && request.resource.data.imageUrl.matches('^https://.*');
      // Solo permitir actualización del contador de likes
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes']) 
                       && request.resource.data.likes is number;
      allow delete: if true;
    }

    // Bloquear todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🌐 Paso 5: Desplegar (Hosting)

Para servir la app como módulo ES (`type="module"`), necesitas un servidor HTTP. Opciones:

### Opción A: Firebase Hosting (recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # Selecciona tu proyecto, directorio público = "."
firebase deploy
```

### Opción B: Servidor local para desarrollo

```bash
node server.js
```

---

## ➕ Multi-Evento

Para crear una nueva boda o evento y permitir el acceso, **no necesitas tocar el código**.

Simplemente ve a Firebase Console -> Firestore Database y:
1. Crea un nuevo documento en la colección `eventos_activos`.
2. Ponle como ID el código de acceso que quieras dar a los invitados (ej: `MIEVENTO`). El sistema lo convertirá a mayúsculas automáticamente.
3. ¡Listo! Ya pueden entrar con ese código.
