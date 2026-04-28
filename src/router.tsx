import { createBrowserRouter } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SearchPage } from '@/pages/SearchPage';
import { BookingPage } from '@/pages/BookingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistorialPage } from '@/pages/HistorialPage';
import { ReschedulePage } from '@/pages/ReschedulePage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminDoctorsPage } from '@/pages/admin/AdminDoctorsPage';
import { AdminSlotsPage } from '@/pages/admin/AdminSlotsPage';
import { AdminAppointmentsPage } from '@/pages/admin/AdminAppointmentsPage';
import { DirectorioEpsPage } from '@/pages/DirectorioEpsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Rutas públicas
      { index: true, element: <HomePage /> },
      { path: 'iniciar-sesion', element: <LoginPage /> },
      { path: 'registrarse', element: <RegisterPage /> },

      // Búsqueda (pública, pero reservar requiere auth)
      { path: 'buscar', element: <SearchPage /> },
      { path: 'buscar/:doctorId', element: <BookingPage /> },
      { path: 'directorio-eps', element: <DirectorioEpsPage /> },

      // Rutas protegidas (requieren autenticación)
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'dashboard/historial', element: <HistorialPage /> },
          { path: 'reprogramar/:appointmentId', element: <ReschedulePage /> },
        ],
      },

      // Rutas de administración (requieren rol admin)
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'medicos', element: <AdminDoctorsPage /> },
          { path: 'disponibilidad', element: <AdminSlotsPage /> },
          { path: 'citas', element: <AdminAppointmentsPage /> },
        ],
      },

      // 404
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
