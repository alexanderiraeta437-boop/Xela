import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/LegalShell";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
};

export default function TerminosPage() {
  return (
    <LegalShell title="Términos y Condiciones" updatedAt="25 de noviembre de 2026">
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          1. Aceptación de los términos
        </h2>
        <p>
          Al crear una cuenta o participar en combates dentro de Xela, aceptas
          cumplir con estos Términos y Condiciones. Si no estás de acuerdo con
          alguna disposición, te recomendamos no utilizar la plataforma.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          2. Cuentas y conducta de los jugadores
        </h2>
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales de
          acceso. Queda estrictamente prohibido utilizar nombres ofensivos,
          alterar el cliente de juego, explotar errores en partidas multijugador o
          interferir con la infraestructura de salas en tiempo real.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          3. Progreso, ranking y desbloqueos
        </h2>
        <p>
          Las estadísticas de victorias, derrotas, rachas, puntos de ranking y
          luchadores desbloqueados pertenecen al ecosistema de juego de Xela y no
          tienen valor monetario ni pueden ser transferidos entre cuentas.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          4. Disponibilidad del servicio
        </h2>
        <p>
          Xela se ofrece tal cual está disponible. Nos reservamos el derecho de
          actualizar mecánicas de combate, equilibrar estadísticas de luchadores o
          realizar mantenimientos programados sin previo aviso.
        </p>
      </section>
    </LegalShell>
  );
}
