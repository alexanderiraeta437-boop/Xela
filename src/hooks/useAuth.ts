"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/stores/useAuthStore";

let authListenerAttached = false;

/**
 * Sincroniza el estado de Firebase Auth con Zustand y Firestore.
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
        try {
          const profile = await ensureUserProfile(firebaseUser);
          setProfile(profile);
        } catch (err) {
          console.error("Error al sincronizar perfil:", err);
        }
      } else {
        reset();
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => {
      unsubscribe();
      authListenerAttached = false;
    };
  }, [setUser, setProfile, setLoading, setInitialized, reset]);
}

export function useAuth() {
  return useAuthStore();
}
