# Xela — Arena de Combate 1 vs 1 en Tiempo Real

**Xela** es un juego web de combates 2D *side-view* 1 vs 1 en tiempo real desarrollado con **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Phaser 3**, **Zustand** y **Firebase** (Authentication, Cloud Firestore y Realtime Database).

---

## Características Principales

- **Autenticación completa**: Registro e inicio de sesión con correo/contraseña, Google Sign-In y recuperación de contraseña.
- **Perfil personalizable**: Nombre visible y selección entre **12 avatares predefinidos** (sin depender de Firebase Storage).
- **8 Luchadores únicos**: Kai, Nova, Rex, Lyra, Blaze, Echo, Vex y Aether, cada uno con estadísticas, movimientos y habilidad especial propia desbloqueable mediante victorias.
- **Combate vs IA (3 niveles)**: Dificultad Fácil, Medio y Difícil impulsada por Phaser 3.
- **Multijugador en tiempo real**: Crea salas con un **código único de 6 caracteres** o únete al instante mediante **Firebase Realtime Database**.
- **Progreso y Ranking**: Guardado automático en **Cloud Firestore**, rachas de victorias y tabla de clasificación global.
- **100% Responsive**: Controles táctiles integrados para móvil y soporte completo de teclado en PC.
- **Páginas legales**: Términos y Condiciones, Política de Privacidad y Política de Cookies.

---

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Estilos y UI**: Tailwind CSS + componentes estilo shadcn/ui + Lucide Icons
- **Motor 2D**: Phaser 3
- **Estado Global**: Zustand
- **Backend / BaaS**: Firebase Authentication, Cloud Firestore y Realtime Database (Plan Spark gratuito, **sin Firebase Storage**)
- **Despliegue objetivo**: Vercel

---

## Estructura del Proyecto

```text
xela/
├── public/
│   ├── logo/xela-logo.svg        # Logo oficial XA blanco sobre negro
│   ├── characters/               # Ilustraciones SVG de los 8 luchadores
│   ├── avatars/                  # 12 avatares predefinidos de perfil
│   ├── backgrounds/              # Fondos de arena
│   ├── ui/                       # Elementos gráficos de interfaz
│   └── favicon.ico               # Favicon oficial XA
├── src/
│   ├── app/
│   │   ├── (auth)/               # login, register, recover
│   │   ├── (main)/               # dashboard, profile, fighters, ranking, create-room, join-room, fight
│   │   ├── legal/                # terminos, privacidad, cookies
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing pública
│   │   └── globals.css
│   ├── components/               # Componentes UI y de dominio + Logo.tsx
│   ├── constants/                # characters.ts y avatars.ts
│   ├── game/                     # Escenas Phaser 3, entidad de luchador y sistemas de combate/IA/red
│   ├── hooks/                    # useAuth.ts
│   ├── lib/                      # firebase.ts, auth.ts, firestore.ts, rtdb.ts, utils.ts
│   ├── stores/                   # Zustand (useAuthStore, useGameStore)
│   └── types/                    # Definiciones TypeScript
├── firestore.rules               # Reglas de seguridad para Firestore
├── database.rules.json           # Reglas de seguridad para Realtime Database
└── .env.local.example
```

---

## Instalación y Ejecución Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Variables de entorno** (opcional, `src/lib/firebase.ts` ya incluye la configuración del proyecto `xelaai`):
   ```bash
   cp .env.local.example .env.local
   ```

3. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000).

4. **Compilar para producción**:
   ```bash
   npm run typecheck
   npm run build
   npm start
   ```

---

## Reglas de Seguridad de Firebase (`xelaai`)

Asegúrate de publicar las reglas incluidas en `firestore.rules` y `database.rules.json` en tu consola de Firebase:

- **Firestore**: `users/{userId}` legible por usuarios autenticados y editable únicamente por su propietario (`request.auth.uid == userId`).
- **Realtime Database**: `rooms/{roomCode}` accesible únicamente para usuarios autenticados (`auth != null`).
- **Authentication**: Activa los proveedores **Email/Password** y **Google**, y agrega tu dominio de Vercel en *Authorized domains*.

---

## Controles en Combate

### PC (Teclado)
- **Moverse**: `A` / `D` o `←` / `→`
- **Saltar**: `W` o `↑`
- **Bloquear**: `S`, `↓` o `Shift`
- **Ataque Ligero**: `J` o `Z`
- **Ataque Fuerte**: `K` o `X`
- **Habilidad Especial** (requiere 50% de energía): `L` o `C`

### Móvil (Táctil)
- Usa la cruceta inferior izquierda para moverte/saltar y los botones inferiores derechos para bloquear y ejecutar ataques ligeros, fuertes o especiales.

---

## Despliegue en Vercel

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. Importa el proyecto en [Vercel](https://vercel.com/).
3. Añade las variables de `.env.local.example` en *Environment Variables* si deseas gestionarlas desde Vercel.
4. Despliega y agrega el dominio `.vercel.app` resultante en **Firebase Console → Authentication → Settings → Authorized domains**.
