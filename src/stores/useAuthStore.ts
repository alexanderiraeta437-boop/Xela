import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/types";
import { getUserProfile } from "@/lib/firestore";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  selectedFighterId: string;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setSelectedFighterId: (fighterId: string) => void;
  refreshProfile: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  selectedFighterId: "kai",

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setSelectedFighterId: (selectedFighterId) => set({ selectedFighterId }),

  refreshProfile: async () => {
    const uid = get().user?.uid;
    if (!uid) return;
    const fresh = await getUserProfile(uid);
    if (fresh) {
      set({ profile: fresh });
    }
  },

  reset: () =>
    set({
      user: null,
      profile: null,
      loading: false,
      selectedFighterId: "kai",
    }),
}));
