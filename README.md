# CitasYA 🩺

**Tu salud. Donde estés. Cuando la necesites.**

Plataforma web centralizada para la gestión de citas médicas de afiliados a EPS en Bogotá, Colombia. Diseñada especialmente para adultos mayores y personas con baja familiaridad digital.

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| React + TypeScript | Frontend con tipado estricto |
| Vite | Build tool + dev server |
| Tailwind CSS v4 | Sistema de diseño utility-first |
| React Router v7 | Navegación SPA |
| Supabase | Auth, DB (PostgreSQL), RLS, Realtime |

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 3. Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key (publishable) de Supabase |

## Estructura del Proyecto

```
src/
├── components/
│   ├── ui/            # Componentes reutilizables (Button, Input, Badge...)
│   ├── layout/        # Navbar, Footer, RootLayout
│   └── appointments/  # Componentes de citas (futuras fases)
├── pages/             # Vistas principales
├── hooks/             # Custom hooks
├── lib/               # Supabase client, constantes, utilidades
├── types/             # Interfaces TypeScript
└── services/          # Adaptadores de servicios
```

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

## Licencia

Proyecto académico — Universidad de Bogotá.
