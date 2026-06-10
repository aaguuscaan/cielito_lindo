// ============================================================
// AUTH.JS — Firebase Compat
// ============================================================

let currentUser = null;
let userRole = null;

// ─────────────────────────────────────────────
// AUTH OBSERVER
// ─────────────────────────────────────────────
function init(onAuthChange) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      userRole = await getUserRole(user.uid);
      onAuthChange?.(user, userRole);
      updateNavUI(user, userRole);
    } else {
      currentUser = null;
      userRole = null;
      onAuthChange?.(null, null);
      updateNavUI(null, null);
    }
  });
}

// ─────────────────────────────────────────────
// ROLE
// ─────────────────────────────────────────────
async function getUserRole(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data().role : 'client';
  } catch {
    return 'client';
  }
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
async function register({ nombre, email, telefono, password }) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: nombre });
    await db.collection('users').doc(cred.user.uid).set({
      nombre,
      email,
      telefono: telefono || '',
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

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
async function login(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    Toast.show('¡Bienvenido de vuelta!', 'success');
    return { ok: true, user: cred.user };
  } catch (e) {
    const msg = firebaseErrorMsg(e.code);
    Toast.show(msg, 'error');
    return { ok: false, error: msg };
  }
}

// ─────────────────────────────────────────────
// GOOGLE LOGIN
// ─────────────────────────────────────────────
async function loginWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await auth.signInWithPopup(provider);
    const snap = await db.collection('users').doc(cred.user.uid).get();
    if (!snap.exists) {
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
    console.error(e);
    Toast.show('Error al iniciar con Google', 'error');
    return { ok: false };
  }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
async function logout() {
  await auth.signOut();
  Toast.show('Sesión cerrada', 'info');
}

// ─────────────────────────────────────────────
// NAV UI
// ─────────────────────────────────────────────
function updateNavUI(user, role) {
  const loginBtn = document.getElementById('nav-login-btn');
  const userMenu = document.getElementById('nav-user-menu');
  const adminBtn = document.getElementById('nav-admin-btn');
  const userName = document.getElementById('nav-user-name');

  if (!loginBtn) return;

  if (user) {
    loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
    if (adminBtn) adminBtn.style.display = role === 'admin' ? 'flex' : 'none';
  } else {
    loginBtn.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────
function firebaseErrorMsg(code) {
  const msgs = {
    'auth/user-not-found': 'No existe una cuenta con ese email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-email': 'Email inválido',
    'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde',
    'auth/network-request-failed': 'Error de conexión',
    'auth/invalid-credential': 'Credenciales inválidas'
  };
  return msgs[code] || 'Ocurrió un error';
}

// ─────────────────────────────────────────────
// EXPORT (objeto global)
// ─────────────────────────────────────────────
const Auth = {
  init,
  register,
  login,
  loginWithGoogle,
  logout,
  getCurrentUser: () => currentUser,
  getRole: () => userRole
};
