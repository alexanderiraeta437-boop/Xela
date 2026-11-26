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
import { useAuthStore } from "@/stores/useAuthStore";

let authListenerAttached = false;

/**
 * Sincroniza el estado de Firebase Auth con Zustand, caché local y Firestore.
 */
export function useAuthSync(): void {
  const { setUser, setProfile, setLoading, setInitialized, reset } =
    useAuthStore();

  useEffect(() => {
    if (authListenerAttached) return;
    authListenerAttached = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);

        // 1. Cargar de inmediato el perfil guardado en caché para evitar pantallas vacías sin red
        const cached = getCachedUserProfile(firebaseUser.uid);
        if (cached) {
          setProfile(cached);
        }

        // 2. Si hay internet, sincronizar progreso offline pendiente y actualizar desde Firestore
        if (typeof navigator !== "undefined" && navigator.onLine) {
          try {
            const synced = await syncPendingOfflineProgress(firebaseUser.uid);
            const profile = synced ?? (await ensureUserProfile(firebaseUser));
            saveCachedUserProfile(profile);
            setProfile(profile);
          } catch (err) {
            console.warn("Modo sin conexión activo, usando perfil en caché:", err);
          }
        }
      } else {
        reset();
      }

      setLoading(false);
      setInitialized(true);
    });

    // Listener global: cuando el celular recupere internet, subir progreso offline pendiente
    const handleOnline = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const syncedProfile = await syncPendingOfflineProgress(currentUser.uid);
        if (syncedProfile) {
          setProfile(syncedProfile);
        }
      } catch (err) {
        console.error("Error sincronizando progreso al volver online:", err);
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
