"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithEmail, loginWithGoogle } from "@/lib/auth";
import { getFirebaseAuthErrorMessage } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (displayName.trim().length < 2) {
      setError("El nombre de jugador debe tener al menos 2 caracteres.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(email.trim(), password, displayName.trim());
      router.push("/dashboard");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Crear Cuenta"
      description="Únete a Xela y empieza tu camino en el ranking global."
      footer={
        <span>
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </span>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nombre de jugador</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              id="displayName"
              type="text"
              required
              maxLength={24}
              placeholder="Ej. ShadowKai"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jugador@xela.gg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          Al registrarte aceptas nuestros{" "}
          <Link href="/legal/terminos" className="text-zinc-300 hover:underline">
            Términos y Condiciones
          </Link>{" "}
          y nuestra{" "}
          <Link
            href="/legal/privacidad"
            className="text-zinc-300 hover:underline"
          >
            Política de Privacidad
          </Link>
          .
        </p>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            "Crear Cuenta"
          )}
        </Button>
      </form>

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-white/10" />
        <span className="mx-3 shrink-0 text-xs uppercase tracking-wider text-zinc-500">
          o regístrate con
        </span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogleRegister}
        disabled={submitting}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
          />
        </svg>
        Google
      </Button>
    </AuthCard>
  );
}
