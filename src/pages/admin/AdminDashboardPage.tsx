import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminStats } from '@/services/admin.service';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await AdminService.getStats();
      if (result.success) setStats(result.data);
      setIsLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            Panel de Administración 🛠️
          </h1>
          <p className="text-text-secondary mt-1">
            Gestiona médicos, disponibilidad y citas de la plataforma.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="100px" rounded="xl" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatItem icon="👨‍⚕️" label="Médicos" value={stats.totalDoctors} />
            <StatItem icon="📅" label="Total citas" value={stats.totalAppointments} />
            <StatItem icon="🟢" label="Citas hoy" value={stats.scheduledToday} />
            <StatItem icon="❌" label="Canceladas" value={stats.cancelledTotal} />
          </div>
        ) : null}

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-primary-800 mb-4">Gestión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminCard
            icon="👨‍⚕️"
            title="Médicos"
            description="Crear, editar y activar/desactivar médicos."
            href="/admin/medicos"
            ctaText="Gestionar médicos"
          />
          <AdminCard
            icon="📋"
            title="Disponibilidad"
            description="Generar y administrar slots de horarios."
            href="/admin/disponibilidad"
            ctaText="Gestionar slots"
          />
          <AdminCard
            icon="🗓️"
            title="Citas"
            description="Ver todas las citas de los pacientes."
            href="/admin/citas"
            ctaText="Ver citas"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Componentes internos ───────────────────────────────────────────────────

interface StatItemProps {
  readonly icon: string;
  readonly label: string;
  readonly value: number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="bg-surface-card border border-primary-100 rounded-xl p-5">
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <p className="text-3xl font-bold text-primary-800 mt-2">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

interface AdminCardProps {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly ctaText: string;
}

function AdminCard({ icon, title, description, href, ctaText }: AdminCardProps) {
  return (
    <div className="bg-surface-card border border-primary-100 rounded-2xl p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300">
      <span className="text-3xl mb-3 block" aria-hidden="true">{icon}</span>
      <h3 className="text-lg font-semibold text-primary-800 mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      <Link to={href}>
        <Button variant="primary" size="sm">
          {ctaText}
          <span aria-hidden="true">→</span>
        </Button>
      </Link>
    </div>
  );
}
