"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  ensureUserProfile,
  getCachedUserProfile,
  saveCachedUserProfile,
  syncPendingOfflineProgress,
} from "@/lib/firestore";
import { createCachedAuthUser, getCachedSession } from "@/lib/session";
import { useAuthStore } from "@/stores/useAuthStore";

let authListenerAttached = false;

/**
 * Sincroniza el estado de Firebase Auth con Zustand, `xela_cached_session` y Firestore.
 * Permite arranque inmediato online/offline si existe una sesión guardada localmente.
 */
export function useAuthSync(): void {
  const { setUser, setProfile, setLoading, setInitialized, reset } =
    useAuthStore();

  useEffect(() => {
    // Hidratación inmediata desde `xela_cached_session` antes de que Firebase Auth responda
    const bootSession = getCachedSession();
    if (bootSession) {
      setUser(auth.currentUser ?? createCachedAuthUser(bootSession));
      setProfile(bootSession);
      setLoading(false);
      setInitialized(true);
    }

    if (authListenerAttached) return;
    authListenerAttached = true;

    const syncWithRemote = async (firebaseUser: NonNullable<typeof auth.currentUser>) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        const synced = await syncPendingOfflineProgress(firebaseUser.uid);
        const profile = synced ?? (await ensureUserProfile(firebaseUser));
        saveCachedUserProfile(profile);
        setProfile(profile);
      } catch (err) {
        console.warn("Modo sin conexión activo, usando xela_cached_session:", err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Cargar de inmediato perfil cacheado para evitar pantallas vacías sin red
        const cached =
          getCachedUserProfile(firebaseUser.uid) ?? getCachedSession();
        if (cached && cached.uid === firebaseUser.uid) {
          setProfile(cached);
        }

        setLoading(false);
        setInitialized(true);

        // Sincronizar en segundo plano con Firestore cuando haya red
        void syncWithRemote(firebaseUser);
      } else {
        // Si existe `xela_cached_session` válido (p. ej. arranque offline en Android APK),
        // mantener la sesión activa offline hasta que vuelva la red o cierre sesión explícitamente.
        const persistentSession = getCachedSession();
        if (persistentSession) {
          setUser(createCachedAuthUser(persistentSession));
          setProfile(persistentSession);
          setLoading(false);
          setInitialized(true);
        } else {
          reset();
        }
      }
    });

    // Cuando el dispositivo recupere internet, sincronizar cambios pendientes y sesión
    const handleOnline = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await syncWithRemote(currentUser);
      } else {
        const persistentSession = getCachedSession();
        if (persistentSession) {
          try {
            const synced = await syncPendingOfflineProgress(persistentSession.uid);
            if (synced) {
              setProfile(synced);
            }
          } catch (err) {
            console.warn("Pendiente sincronización con Auth:", err);
          }
        }
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      authListenerAttached = false;
    };
  }, [setUser, setProfile, setLoading, setInitialized, reset]);
}

export function useAuth() {
  return useAuthStore();
}
