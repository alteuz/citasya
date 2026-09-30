import type { RouteObject } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';

// Definición de rutas compartida por el navegador (src/router.tsx) y por el
// prerenderizado estático (src/prerender.tsx).
//
// División de código por ruta: cada página se descarga solo cuando se visita.
// Evita que las páginas internas carguen dependencias exclusivas de otras
// (p. ej., framer-motion, que solo usa la página de inicio).
export const rutas: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    // Mientras se descarga la página inicial no se muestra nada: el HTML de
    // index.html ya pinta el fondo, y un indicador de carga produciría un
    // cambio de diseño (CLS) al ser reemplazado. Se declara como componente
    // (y no como `null`) para que React Router lo reconozca y no advierta.
    HydrateFallback: () => null,
    children: [
      // Rutas públicas
      { index: true, lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.HomePage })) },
      { path: 'iniciar-sesion', lazy: () => import('@/pages/LoginPage').then((m) => ({ Component: m.LoginPage })) },
      { path: 'registrarse', lazy: () => import('@/pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },

      // Búsqueda (pública, pero reservar requiere auth)
      { path: 'buscar', lazy: () => import('@/pages/SearchPage').then((m) => ({ Component: m.SearchPage })) },
      { path: 'buscar/:doctorId', lazy: () => import('@/pages/BookingPage').then((m) => ({ Component: m.BookingPage })) },
      { path: 'directorio-eps', lazy: () => import('@/pages/DirectorioEpsPage').then((m) => ({ Component: m.DirectorioEpsPage })) },

      // Rutas protegidas (requieren autenticación)
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', lazy: () => import('@/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage })) },
          { path: 'dashboard/historial', lazy: () => import('@/pages/HistorialPage').then((m) => ({ Component: m.HistorialPage })) },
          { path: 'reprogramar/:appointmentId', lazy: () => import('@/pages/ReschedulePage').then((m) => ({ Component: m.ReschedulePage })) },
        ],
      },

      // Rutas de administración (requieren rol admin)
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          { index: true, lazy: () => import('@/pages/admin/AdminDashboardPage').then((m) => ({ Component: m.AdminDashboardPage })) },
          { path: 'medicos', lazy: () => import('@/pages/admin/AdminDoctorsPage').then((m) => ({ Component: m.AdminDoctorsPage })) },
          { path: 'disponibilidad', lazy: () => import('@/pages/admin/AdminSlotsPage').then((m) => ({ Component: m.AdminSlotsPage })) },
          { path: 'citas', lazy: () => import('@/pages/admin/AdminAppointmentsPage').then((m) => ({ Component: m.AdminAppointmentsPage })) },
        ],
      },

      // 404
      { path: '*', lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
    ],
  },
];
