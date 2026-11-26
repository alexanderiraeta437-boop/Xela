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
  await ensureUserProfile(credential.user, cleanName);

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
  await ensureUserProfile(credential.user);
  return credential.user;
}

/**
 * Inicia sesión con Google y sincroniza el perfil en Firestore.
 */
export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

/**
 * Envía un correo de recuperación de contraseña.
 */
export async function recoverPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Cierra la sesión actual del usuario.
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
