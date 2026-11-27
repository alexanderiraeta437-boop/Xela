"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Swords,
  Users,
  Trophy,
  PlusSquare,
  LogIn,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShoppingBag,
  Coins,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/auth";
import { getAvatarById } from "@/constants/avatars";
import {
  isMuted,
  subscribeAudioState,
  toggleMute,
  unlockBattleAudio,
} from "@/lib/battleAudio";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Arena", icon: Swords },
  { href: "/fighters", label: "Luchadores", icon: Users },
  { href: "/shop", label: "Tienda", icon: ShoppingBag },
  { href: "/create-room", label: "Crear Sala", icon: PlusSquare },
  { href: "/join-room", label: "Unirse", icon: LogIn },
  { href: "/ranking", label: "Ranking", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(() => isMuted());

  useEffect(() => {
    return subscribeAudioState((state) => {
      setAudioMuted(state.muted);
    });
  }, []);

  const avatar = getAvatarById(profile?.avatarId);
  const coins = profile?.coins ?? 0;

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOutUser();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050507]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Saldo Xela Coins + Audio + Perfil Desktop */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {user && (
            <>
              <Link
                href="/shop"
                className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
                title="Saldo de Xela Coins"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono">{coins.toLocaleString("es-MX")}</span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-amber-200/80 sm:inline">
                  Coins
                </span>
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  unlockBattleAudio();
                  toggleMute();
                }}
                className={cn(
                  "h-9 w-9",
                  audioMuted ? "text-rose-400" : "text-zinc-400 hover:text-white"
                )}
                title={audioMuted ? "Activar música" : "Silenciar música"}
                aria-label={audioMuted ? "Activar música" : "Silenciar música"}
              >
                {audioMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}

          {user && (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors",
                  pathname === "/profile"
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-zinc-950 hover:border-white/25"
                )}
              >
                <img
                  src={avatar.src}
                  alt={avatar.name}
                  className="h-7 w-7 rounded-lg object-cover"
                />
                <div className="flex flex-col text-left leading-tight">
                  <span className="max-w-[110px] truncate text-xs font-semibold text-white">
                    {profile?.displayName || "Luchador"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {profile?.rankingPoints ?? 1000} PTS
                  </span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="text-zinc-400 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xl:inline">Cerrar sesión</span>
              </Button>
            </div>
          )}

          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-200 lg:hidden"
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#07070b] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium",
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium",
                pathname === "/profile"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <UserIcon className="h-4 w-4" />
              Perfil ({profile?.displayName || "Luchador"})
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-left text-sm font-medium text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
