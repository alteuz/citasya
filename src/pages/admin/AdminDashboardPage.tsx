import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/Skeleton';
import { estilosBoton } from '@/components/ui/estilosBoton';
import { AdminService, type AdminStats } from '@/services/admin.service';
import { ArrowRight, CalendarCheck, CalendarDays, CircleX, ClipboardList, Network, Stethoscope, type LucideIcon } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

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
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl md:text-3xl text-text-primary">
            Panel de Administración
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
            <StatItem icon={Stethoscope} label="Médicos" value={stats.totalDoctors} />
            <StatItem icon={CalendarDays} label="Total citas" value={stats.totalAppointments} />
            <StatItem icon={CalendarCheck} label="Citas hoy" value={stats.scheduledToday} />
            <StatItem icon={CircleX} label="Canceladas" value={stats.cancelledTotal} />
          </div>
        ) : null}

        {/* Quick Actions */}
        <h2 className="font-sans text-xl font-semibold text-text-primary mb-4">Gestión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminCard
            icon={Stethoscope}
            title="Médicos"
            description="Crear, editar y activar/desactivar médicos."
            href="/admin/medicos"
            ctaText="Gestionar médicos"
          />
          <AdminCard
            icon={ClipboardList}
            title="Disponibilidad"
            description="Generar y administrar slots de horarios."
            href="/admin/disponibilidad"
            ctaText="Gestionar slots"
          />
          <AdminCard
            icon={CalendarDays}
            title="Citas"
            description="Ver todas las citas de los pacientes."
            href="/admin/citas"
            ctaText="Ver citas"
          />
          <AdminCard
            icon={Network}
            title="Interoperabilidad FHIR"
            description="Ver cómo se publican las citas en el servidor HL7 FHIR y sincronizar."
            href="/admin/fhir"
            ctaText="Ver interoperabilidad"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Componentes internos ───────────────────────────────────────────────────

interface StatItemProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="bg-surface-card border border-line rounded-2xl p-5">
      <IconBadge icon={icon} size="sm" />
      <p className="text-3xl font-bold text-text-primary mt-2 tabular-nums">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

interface AdminCardProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly ctaText: string;
}

function AdminCard({ icon, title, description, href, ctaText }: AdminCardProps) {
  return (
    <div className="bg-surface-card border border-line rounded-2xl p-6 hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5 transicion h-full">
      <IconBadge icon={icon} tone="brand" size="sm" className="mb-4" />
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      {/* Enlace con apariencia de botón: un <button> dentro de un <a> no es HTML válido. */}
      <Link to={href} className={estilosBoton({ variant: 'primary', size: 'sm' })}>
        {ctaText}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
