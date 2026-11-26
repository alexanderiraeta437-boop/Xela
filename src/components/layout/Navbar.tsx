"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/auth";
import { getAvatarById } from "@/constants/avatars";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Arena", icon: Swords },
  { href: "/fighters", label: "Luchadores", icon: Users },
  { href: "/create-room", label: "Crear Sala", icon: PlusSquare },
  { href: "/join-room", label: "Unirse", icon: LogIn },
  { href: "/ranking", label: "Ranking", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatar = getAvatarById(profile?.avatarId);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050507]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
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

        {/* Perfil + Acciones Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {user && (
            <>
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
                  <span className="max-w-[120px] truncate text-xs font-semibold text-white">
                    {profile?.displayName || "Luchador"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {profile?.rankingPoints ?? 1000} PTS
                  </span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 text-zinc-400" />
              </Button>
            </>
          )}
        </div>

        {/* Botón menú móvil */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-200 md:hidden"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menú desplegable móvil */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#07070b] px-4 py-4 md:hidden">
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
