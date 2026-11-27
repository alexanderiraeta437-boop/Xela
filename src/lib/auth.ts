import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { ensureUserProfile } from "./firestore";
import { clearCachedSession } from "./session";
import { useAuthStore } from "@/stores/useAuthStore";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Registra un nuevo usuario con correo y contraseña y crea su perfil en Firestore.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const cleanName = displayName.trim() || email.split("@")[0] || "Luchador";

  await updateProfile(credential.user, { displayName: cleanName });
  const profile = await ensureUserProfile(credential.user, cleanName);
  useAuthStore.getState().setUser(credential.user);
  useAuthStore.getState().setProfile(profile);

  return credential.user;
}

/**
 * Inicia sesión con correo y contraseña y actualiza la fecha de último acceso.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(credential.user);
  useAuthStore.getState().setUser(credential.user);
  useAuthStore.getState().setProfile(profile);
  return credential.user;
}

/**
 * Inicia sesión con Google y sincroniza el perfil en Firestore.
 */
export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await ensureUserProfile(credential.user);
  useAuthStore.getState().setUser(credential.user);
  useAuthStore.getState().setProfile(profile);
  return credential.user;
}

/**
 * Envía un correo de recuperación de contraseña.
 */
export async function recoverPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Cierra la sesión actual del usuario limpiando `xela_cached_session`
 * y haciendo `signOut` en Firebase (funciona incluso sin conexión).
 */
export async function signOutUser(): Promise<void> {
  clearCachedSession();
  useAuthStore.getState().reset();
  try {
    await firebaseSignOut(auth);
  } catch {
    // Permitir cierre de sesión limpio aunque no haya conexión
  }
}
