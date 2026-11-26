"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Swords,
  Zap,
  Shield,
  Trophy,
  Users,
  ArrowRight,
  Download,
  Smartphone,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHARACTERS } from "@/constants/characters";

const APK_DOWNLOAD_URL =
  "https://github.com/alexanderiraeta437-boop/Xela/releases/download/v1.0.0/Xela-Combates-1v1-v1.0.apk";

export default function LandingPage() {
  const [isNativeApk, setIsNativeApk] = useState(false);

  useEffect(() => {
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) {
      setIsNativeApk(true);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#050507]">
      {/* Header Público */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050507]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {!isNativeApk && (
              <a
                href={APK_DOWNLOAD_URL}
                download
                className="hidden sm:inline-flex"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 text-cyan-400" />
                  APK Android
                </Button>
              </a>
            )}
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Crear Cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/10 bg-xela-grid py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.12),transparent_55%)]" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6">
            <Logo size="xl" showText={false} className="mb-6" />

            <Badge
              variant="accent"
              className="mb-5 px-4 py-1 text-xs uppercase tracking-[0.2em]"
            >
              Combates 2D Side-View en Tiempo Real
            </Badge>

            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Domina la arena 1 vs 1 en{" "}
              <span className="bg-gradient-to-r from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                XELA
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Enfréntate a la inteligencia artificial en 3 niveles de dificultad o
              crea una sala con código de 6 caracteres para combatir contra tus
              amigos en tiempo real desde móvil o PC.
            </p>

            <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Entrar a la Arena
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Ya tengo cuenta
                </Button>
              </Link>
              {!isNativeApk && (
                <a
                  href={APK_DOWNLOAD_URL}
                  download
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    Descargar APK (v1.0)
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Sección de Descarga Oficial Android (Catálogo Xela) */}
        {!isNativeApk && (
          <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-[#0B0B12] via-[#0E131D] to-[#0B0B12] p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />

              <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="space-y-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    <Smartphone className="h-3.5 w-3.5" />
                    App Oficial para Android • v1.0.0
                  </div>

                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    Xela: Combates 1 vs 1 (APK)
                  </h2>

                  <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                    Instala el juego directo en tu celular Android. Entrena y
                    desbloquea luchadores contra la IA incluso sin conexión a
                    internet; tu progreso se sincroniza automáticamente con tu
                    cuenta al volver a conectarte.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <WifiOff className="h-3.5 w-3.5 text-cyan-400" />
                      Modo Offline vs IA
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                      Sincronización con tu perfil
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Swords className="h-3.5 w-3.5 text-cyan-400" />
                      Controles táctiles optimizados
                    </span>
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                  <a href={APK_DOWNLOAD_URL} download className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto">
                      <Download className="h-4 w-4" />
                      Descargar APK (11.2 MB)
                    </Button>
                  </a>
                  <span className="text-center text-[11px] text-zinc-500 sm:text-right">
                    Android 7.0 o superior • Instalación directa
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Características principales */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Swords,
                title: "Combate Técnico 2D",
                desc: "Ataque ligero, ataque fuerte, habilidad especial y bloqueo táctico con física fluida en Phaser 3.",
              },
              {
                icon: Users,
                title: "Salas de 6 Caracteres",
                desc: "Genera un código único al instante y compártelo para duelos 1 vs 1 sincronizados en tiempo real.",
              },
              {
                icon: Zap,
                title: "IA de 3 Niveles",
                desc: "Practica contra bots en dificultad Fácil, Medio o Difícil para perfeccionar tus combos.",
              },
              {
                icon: Trophy,
                title: "Ranking y Desbloqueos",
                desc: "Suma puntos de clasificación, mantén tu racha y desbloquea los 8 luchadores del plantel.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#0B0B10] p-6 transition-colors hover:border-white/25"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-cyan-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plantel de Luchadores */}
        <section className="border-t border-white/10 bg-[#07070B] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  Plantel Oficial
                </span>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">
                  8 Luchadores Únicos
                </h2>
              </div>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4" />
                  Desbloquear en el juego
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CHARACTERS.map((char) => (
                <div
                  key={char.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B12] p-5 transition-all hover:-translate-y-0.5 hover:border-white/25"
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
                    style={{ backgroundColor: char.themeColor }}
                  />
                  <div className="flex items-center gap-4">
                    <img
                      src={`/characters/${char.id}.svg`}
                      alt={char.name}
                      className="h-16 w-16 shrink-0 rounded-xl border border-white/10 bg-black/70 object-contain p-1"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-white">
                        {char.name}
                      </h3>
                      <p
                        className="truncate text-xs font-semibold uppercase tracking-wider"
                        style={{ color: char.themeColor }}
                      >
                        {char.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Especial: {char.specialName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}