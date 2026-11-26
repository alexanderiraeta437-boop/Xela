import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/LegalShell";

export const metadata: Metadata = {
  title: "Política de Cookies",
};

export default function CookiesPage() {
  return (
    <LegalShell title="Política de Cookies" updatedAt="25 de noviembre de 2026">
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          1. ¿Qué tecnologías de almacenamiento utilizamos?
        </h2>
        <p>
          Xela utiliza cookies técnicas y almacenamiento local del navegador
          (localStorage e IndexedDB) estrictamente necesarios para mantener tu
          sesión iniciada mediante Firebase Authentication y recordar preferencias
          básicas de interfaz.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          2. Tipos de cookies utilizadas
        </h2>
        <p>
          Solo empleamos almacenamiento funcional y de seguridad. No utilizamos
          cookies publicitarias ni rastreadores de terceros con fines comerciales.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          3. Control desde el navegador
        </h2>
        <p>
          Puedes borrar o bloquear las cookies desde la configuración de tu
          navegador en cualquier momento; sin embargo, hacerlo cerrará tu sesión
          activa y requerirá volver a autenticarte para acceder a la arena.
        </p>
      </section>
    </LegalShell>
  );
}
