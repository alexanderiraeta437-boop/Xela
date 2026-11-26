import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidad",
};

export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de Privacidad" updatedAt="25 de noviembre de 2026">
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          1. Datos que recopilamos
        </h2>
        <p>
          Para ofrecer autenticación y guardado de progreso, Xela almacena tu
          identificador de usuario, correo electrónico, nombre visible, avatar
          predefinido seleccionado y estadísticas de juego (victorias, derrotas,
          racha, puntos de ranking y luchadores desbloqueados).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          2. Uso de servicios de Firebase
        </h2>
        <p>
          La plataforma utiliza Firebase Authentication, Cloud Firestore y
          Firebase Realtime Database para gestionar sesiones seguras, guardar tu
          progreso y sincronizar partidas 1 vs 1 mediante códigos de sala. No
          solicitamos ni almacenamos fotografías personales en Firebase Storage.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          3. Visibilidad en el ranking
        </h2>
        <p>
          Tu nombre de jugador, avatar predefinido, puntuación y estadísticas
          generales de combate pueden mostrarse en la tabla de clasificación
          global visible para otros jugadores autenticados.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-white">
          4. Derechos del usuario
        </h2>
        <p>
          Puedes actualizar tu nombre visible y tu avatar predefinido en
          cualquier momento desde la sección de perfil dentro de la aplicación.
        </p>
      </section>
    </LegalShell>
  );
}
