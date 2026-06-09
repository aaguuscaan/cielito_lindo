# 🏡 Cielito Lindo — Web Premium para Cabaña

Sitio profesional de alquiler de cabaña con sistema de reservas, panel admin y Firebase.

---

## 📁 Estructura del proyecto

```
cielito-lindo/
├── index.html          ← Página principal
├── login.html          ← Página de login independiente
├── admin.html          ← Panel de administración (solo admin)
├── 404.html            ← Página de error
├── css/
│   ├── styles.css      ← Estilos principales (todo el sitio)
│   └── admin.css       ← Estilos adicionales del admin
├── js/
│   ├── firebase-config.js   ← Configuración Firebase (EDITAR)
│   ├── auth.js              ← Autenticación + Toast
│   ├── bookings.js          ← Reservas + Calendario
│   ├── gallery.js           ← Galería + Lightbox + Reseñas
│   ├── admin.js             ← Lógica del panel admin
│   ├── admin-page.js        ← Controlador de la página admin
│   └── main.js              ← Lógica principal del sitio
└── README.md
```

---

## 🚀 Configuración paso a paso

### 1. Crear proyecto Firebase

1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Crear nuevo proyecto (ej: `cielito-lindo`)
3. Activar **Authentication** → Email/Password + Google
4. Activar **Firestore Database** (modo producción)
5. Activar **Storage**

### 2. Obtener configuración Firebase

En Firebase Console → Configuración del proyecto → Tus apps → Web

Copiar el objeto `firebaseConfig` y pegarlo en `js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Configurar reglas de Firestore

En Firebase Console → Firestore → Reglas, pegar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cabins/{cabinId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /bookings/{bookingId} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /contactMessages/{msgId} {
      allow create: if true;
      allow read, delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 4. Configurar reglas de Storage

En Firebase Console → Storage → Reglas:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cabins/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 5. Crear documento inicial de la cabaña

En Firestore → Colecciones → Nueva colección `cabins` → Documento con ID `cielito-lindo`:

```json
{
  "nombre": "Cielito Lindo",
  "descripcion": "Una cabaña de montaña diseñada para reconectar con lo esencial...",
  "precio": 45000,
  "capacidad": 6,
  "servicios": ["WiFi", "Pileta", "Asador", "Cocina Equipada", "Estacionamiento"],
  "imagenes": [],
  "ubicacion": "Villa Yacanto, Córdoba, Argentina",
  "activa": true
}
```

### 6. Crear primer usuario administrador

1. Registrarse en el sitio con tu email
2. En Firestore → Colección `users` → encontrar tu documento (ID = tu UID)
3. Editar el campo `role` de `"client"` a `"admin"`

¡Listo! Ya podés acceder al panel admin en `/admin.html`

### 7. Personalizar datos de contacto

En `index.html`, buscar y reemplazar:
- `5493516000000` → Tu número de WhatsApp (formato internacional sin +)
- `hola@cielitolindo.com.ar` → Tu email
- `+54 9 351 600-0000` → Tu teléfono visible

---

## 🌐 Deploy

### Opción A: Firebase Hosting (recomendado — gratis)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: . (raíz)
# SPA: No
firebase deploy
```

### Opción B: Netlify (drag & drop)

1. Ir a [netlify.com](https://netlify.com)
2. Arrastrar la carpeta del proyecto
3. ¡Listo!

### Opción C: GitHub Pages

1. Subir a repositorio GitHub
2. Settings → Pages → Deploy from branch

---

## 📱 Funcionalidades

| Funcionalidad | Estado |
|---|---|
| Diseño responsive (mobile/tablet/desktop) | ✅ |
| Dark mode | ✅ |
| Animaciones scroll | ✅ |
| Galería con lightbox | ✅ |
| Calendario interactivo | ✅ |
| Sistema de reservas | ✅ |
| Login / Registro / Google Auth | ✅ |
| Reseñas con estrellas | ✅ |
| Panel Admin completo | ✅ |
| Gestión de reservas admin | ✅ |
| Bloqueo de fechas | ✅ |
| Subida de imágenes | ✅ |
| Edición de precios | ✅ |
| Formulario de contacto | ✅ |
| WhatsApp flotante | ✅ |
| Toast notifications | ✅ |
| Página 404 | ✅ |
| SEO meta tags | ✅ |
| Open Graph | ✅ |

---

## 🎨 Personalización

### Cambiar imágenes del hero y secciones
En `index.html`, buscar las URLs de Unsplash y reemplazarlas con tus fotos reales.
Subí tus imágenes desde el panel Admin → Galería.

### Cambiar colores
En `css/styles.css`, modificar las variables CSS en `:root`:
```css
:root {
  --wood: #8B6348;       /* Color principal marrón */
  --olive: #6B7B4E;      /* Verde oliva */
  --sand: #D4B896;       /* Arena */
  /* etc. */
}
```

### Cambiar precio base
Desde el Panel Admin → Configuración → Precio por noche.

---

## ⚠️ Notas importantes

- **No compartir** el archivo `firebase-config.js` con claves reales en repositorios públicos
- Usar variables de entorno o Firebase App Check en producción
- Las imágenes de Unsplash son de placeholder; reemplazarlas con fotos reales de la cabaña
- El mapa de Google Maps puede requerir API key para uso intensivo

---

Desarrollado con ❤️ para Cielito Lindo — Villa Yacanto, Córdoba 🇦🇷
