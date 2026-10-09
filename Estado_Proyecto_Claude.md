# Estado del Proyecto: Álbum de Barro (Pop-up Social Network)

**Para:** Claude (AI)
**De:** Antigravity (AI) & El Usuario
**Contexto:** Estamos en medio de la transición técnica de un MVP (Álbum digital básico) a una plataforma más robusta (Fase 1: Seguridad) y planeando una evolución hacia una "Red Social Efímera" (Fase 2).

---

## 🌍 Estado de Producción (En vivo)
* **Frontend:** React + Vite (PWA).
* **Backend:** Firebase Firestore (Tiempo Real). Storage NO se usa.
* **Seguridad Actual:** Abierta (`allow read, write: if true`).
* **Auth:** Inexistente. Todo es público. Los administradores usan un password hardcodeado en el JS (`'ceramica'`).
* **Manejo de Imágenes:** Se comprimen en el cliente (aprox 13KB a 200KB) usando un Canvas o `browser-image-compression` y se guardan como **Base64 (Data URLs)** directamente en los documentos de Firestore.
* **Vulnerabilidad Crítica:** El PIN del anfitrión (`adminPin`) está guardado en texto plano en la colección `eventos_activos/{code}`. Los invitados (clientes) descargan todo el documento al loguearse, exponiendo el PIN en el Network Tab.

---

## 🛠 Estado Local / Pruebas (Fase 1 - En Progreso)
Hemos desarrollado localmente las defensas necesarias, pero **NO las hemos publicado en producción**.

### 1. Migración del PIN del Anfitrión (Script de Nodo Local)
Para sacar el PIN de la vista pública, preparamos un script que mueve los PINs a una subcolección ciega: `eventos_activos/{code}/secrets/pin`.
```javascript
// scripts/migratePins.js
// ... (código que usa firebase-admin/firestore para mover el PIN a una subcolección 'secrets' y hacer backup)
```

### 2. Autenticación (Firebase Auth)
Inyectamos en `app.js` la inicialización de Auth.
* Los administradores usarán `signInWithEmailAndPassword`.
* Los invitados usarán `signInAnonymously()`.

### 3. Reglas de Firestore (Locales y Testeadas)
Creamos `firestore.rules` y pasamos las pruebas con `@firebase/rules-unit-testing`. Las reglas incluyen:
* Límite estricto de `450,000` caracteres para los campos Base64 (`imageUrl`, `photoUrl`).
* Validación de incrementos de Likes (`likes == resource.data.likes + 1`).
* Validación de Anfitriones usando el "Pin Ciego": Para reclamar el rol, se crea un doc en `events/{code}/hosts/{uid}` y la regla valida que el PIN insertado coincida haciendo `get()` a la ruta `secrets/pin`.

```javascript
// Resumen de la Estructura de firestore.rules preparada:
match /eventos_activos/{code} {
  allow get: if isSignedIn(); // Invitados
  allow list, write: if isAdmin();
  
  match /secrets/{secretId} { allow read, write: if isAdmin(); }
}

match /events/{code} {
  match /hosts/{hostUid} {
    allow create: if get(/databases/$(database)/documents/eventos_activos/$(code)/secrets/pin).data.pin == request.resource.data.pin;
  }
  match /guest_entries/{entryId} {
    allow create: if request.resource.data.imageUrl.size() < 450000;
    allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes']);
  }
}
```

---

## 🚀 La Visión Comercial (Fase 2 - Pop-up Social Network)
Queremos transformar el álbum en una red social que funcione solo durante la fiesta. Factores que buscamos implementar:
1. **Identidad Efímera:** Requerir una selfie/nombre al entrar (Perfil de Invitado).
2. **Muro Interactivo:** Reemplazar la galería estática por un feed con comentarios en tiempo real.
3. **Chat de la Fiesta (Shoutbox):** Un muro global paralelo.
4. **Cuenta Regresiva de Autodestrucción:** La red se bloquea a las 24 hrs.
5. **Match Secreto:** En la sección de Solteros, likes anónimos con alertas de match.

---
**Instrucción para Claude:** 
Por favor lee este estado actual. El usuario quiere tu validación arquitectónica y de negocio sobre la Fase 2, y que guíes los próximos pasos considerando que la Fase 1 (Seguridad Local) está lista pero sin desplegar.
