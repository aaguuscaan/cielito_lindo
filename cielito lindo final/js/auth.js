// ============================================================
// AUTH.JS - Autenticación Firebase
// ============================================================
import { auth } from "./firebase-config.js";

export function initAuth() {
  console.log("Auth listo:", auth);
}

const Auth = (() => {
  let currentUser = null;
  let userRole = null;

  // Observer de estado de auth
  function init(onAuthChange) {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = user;
        userRole = await getUserRole(user.uid);
        onAuthChange && onAuthChange(user, userRole);
        updateNavUI(user, userRole);
      } else {
        currentUser = null;
        userRole = null;
        onAuthChange && onAuthChange(null, null);
        updateNavUI(null, null);
      }
    });
  }

  // Obtener rol del usuario
  async function getUserRole(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? doc.data().role : 'client';
    } catch (e) {
      return 'client';
    }
  }

  // Registro
  async function register({ nombre, email, telefono, password }) {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: nombre });
      await db.collection('users').doc(cred.user.uid).set({
        nombre,
        email,
        telefono,
        role: 'client',
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      Toast.show('¡Cuenta creada con éxito!', 'success');
      return { ok: true, user: cred.user };
    } catch (e) {
      const msg = firebaseErrorMsg(e.code);
      Toast.show(msg, 'error');
      return { ok: false, error: msg };
    }
  }

  // Login
  async function login(email, password) {
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      Toast.show(`¡Bienvenido de vuelta!`, 'success');
      return { ok: true, user: cred.user };
    } catch (e) {
      const msg = firebaseErrorMsg(e.code);
      Toast.show(msg, 'error');
      return { ok: false, error: msg };
    }
  }

  // Login con Google
  async function loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await auth.signInWithPopup(provider);
      // Crear usuario si no existe
      const userDoc = await db.collection('users').doc(cred.user.uid).get();
      if (!userDoc.exists) {
        await db.collection('users').doc(cred.user.uid).set({
          nombre: cred.user.displayName,
          email: cred.user.email,
          telefono: '',
          role: 'client',
          creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      Toast.show('¡Bienvenido!', 'success');
      return { ok: true, user: cred.user };
    } catch (e) {
      Toast.show('Error al iniciar con Google', 'error');
      return { ok: false };
    }
  }

  // Logout
  async function logout() {
    await auth.signOut();
    Toast.show('Sesión cerrada', 'info');
  }

  // Actualizar navbar según auth
  function updateNavUI(user, role) {
    const loginBtn = document.getElementById('nav-login-btn');
    const userMenu = document.getElementById('nav-user-menu');
    const adminBtn = document.getElementById('nav-admin-btn');
    const userName = document.getElementById('nav-user-name');

    if (!loginBtn) return;

    if (user) {
      loginBtn.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'flex';
        if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
      }
      if (adminBtn) adminBtn.style.display = role === 'admin' ? 'flex' : 'none';
    } else {
      loginBtn.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }

  // Mensajes de error Firebase en español
  function firebaseErrorMsg(code) {
    const msgs = {
      'auth/user-not-found': 'No existe una cuenta con ese email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde',
      'auth/network-request-failed': 'Error de conexión'
    };
    return msgs[code] || 'Ocurrió un error. Intentá de nuevo';
  }

  return { init, register, login, loginWithGoogle, logout, getCurrentUser: () => currentUser, getRole: () => userRole };
})();

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
const Toast = (() => {
  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container') || createContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `<span class="toast__icon">${icons[type]}</span><span class="toast__msg">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  function createContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
  }

  return { show };
})();