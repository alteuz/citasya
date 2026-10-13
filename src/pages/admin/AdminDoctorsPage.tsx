import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminDoctor, type CreateDoctorInput } from '@/services/admin.service';
import { DoctorsService, type SpecialtyOption, type EpsOption } from '@/services/doctors.service';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { ServiceResult } from '@/types/common';
import { ArrowLeft } from 'lucide-react';

interface DoctorsCatalog {
  readonly doctors: readonly AdminDoctor[];
  readonly specialties: readonly SpecialtyOption[];
  readonly epsList: readonly EpsOption[];
}

/** Médicos (obligatorio) + catálogos para el formulario (opcionales). */
async function loadDoctorsCatalog(): Promise<ServiceResult<DoctorsCatalog>> {
  const [docRes, specRes, epsRes] = await Promise.all([
    AdminService.getAllDoctors(),
    DoctorsService.getSpecialties(),
    DoctorsService.getEpsList(),
  ]);
  if (!docRes.success) return docRes;
  return {
    success: true,
    data: {
      doctors: docRes.data,
      specialties: specRes.success ? specRes.data : [],
      epsList: epsRes.success ? epsRes.data : [],
    },
  };
}

export function AdminDoctorsPage() {
  const { data, error, isLoading, reload: loadData } = useServiceQuery(loadDoctorsCatalog, []);
  const doctors = data?.doctors ?? [];
  const specialties = data?.specialties ?? [];
  const epsList = data?.epsList ?? [];
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formEps, setFormEps] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);


  const handleCreate = useCallback(async () => {
    if (!formName.trim() || !formLicense.trim() || !formSpecialty || !formEps) {
      setFormError('Todos los campos obligatorios deben completarse.');
      return;
    }

    setIsCreating(true);
    setFormError(null);

    const input: CreateDoctorInput = {
      fullName: formName.trim(),
      licenseNumber: formLicense.trim(),
      specialtyId: formSpecialty,
      epsId: formEps,
      phone: formPhone.trim(),
      email: formEmail.trim(),
    };

    const result = await AdminService.createDoctor(input);
    setIsCreating(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    // Reset form and reload
    setFormName('');
    setFormLicense('');
    setFormSpecialty('');
    setFormEps('');
    setFormPhone('');
    setFormEmail('');
    setShowForm(false);
    loadData();
  }, [formName, formLicense, formSpecialty, formEps, formPhone, formEmail, loadData]);

  const handleToggle = useCallback(async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    const result = await AdminService.toggleDoctorActive(id, !currentActive);
    setTogglingId(null);

    if (result.success) {
      loadData();
    } else {
      alert(result.error);
    }
  }, [loadData]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3">
            <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl text-text-primary">
              Gestión de Médicos
            </h1>
            <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Nuevo médico'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showForm && (
          <div className="bg-surface-card border border-line rounded-2xl p-6 mb-8 animate-fade-in">
            <h2 className="font-sans text-lg font-semibold text-text-primary mb-4">Registrar nuevo médico</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-name" className="text-sm font-medium text-text-secondary block mb-1.5">Nombre completo *</label>
                <input id="doc-name" type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="control-campo"
                  placeholder="Dr. Juan Pérez López" />
              </div>
              <div>
                <label htmlFor="doc-license" className="text-sm font-medium text-text-secondary block mb-1.5">Número de registro *</label>
                <input id="doc-license" type="text" value={formLicense} onChange={(e) => setFormLicense(e.target.value)}
                  className="control-campo"
                  placeholder="RM-12345" />
              </div>
              <div>
                <label htmlFor="doc-specialty" className="text-sm font-medium text-text-secondary block mb-1.5">Especialidad *</label>
                <select id="doc-specialty" value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)}
                  className="control-campo">
                  <option value="">Seleccionar...</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="doc-eps" className="text-sm font-medium text-text-secondary block mb-1.5">EPS *</label>
                <select id="doc-eps" value={formEps} onChange={(e) => setFormEps(e.target.value)}
                  className="control-campo">
                  <option value="">Seleccionar...</option>
                  {epsList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="doc-phone" className="text-sm font-medium text-text-secondary block mb-1.5">Teléfono</label>
                <input id="doc-phone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                  className="control-campo"
                  placeholder="(601) 123-4567" />
              </div>
              <div>
                <label htmlFor="doc-email" className="text-sm font-medium text-text-secondary block mb-1.5">Email</label>
                <input id="doc-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                  className="control-campo"
                  placeholder="doctor@email.com" />
              </div>
            </div>

            {formError && (
              <div role="alert" className="bg-error-soft border border-error/30 text-error text-sm font-medium px-4 py-3 rounded-xl mt-4">
                {formError}
              </div>
            )}

            <div className="mt-4">
              <Button variant="primary" size="md" isLoading={isCreating} onClick={() => { void handleCreate(); }}>
                Registrar médico
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} height="80px" rounded="xl" />)}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadData} className="mt-4">Reintentar</Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto bg-surface-card border border-line rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-muted">
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Especialidad</th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">EPS</th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Registro</th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Estado</th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc.id} className="border-b border-line last:border-b-0 hover:bg-surface-hover">
                    <td className="py-3 px-4 text-sm font-medium text-text-primary">{doc.fullName}</td>
                    <td className="py-3 px-4 text-sm text-accent font-medium">{doc.specialtyName}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{doc.epsName}</td>
                    <td className="py-3 px-4 text-sm text-text-muted">{doc.licenseNumber}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${doc.active ? 'bg-success-soft text-success border-success/30' : 'bg-error-soft text-error border-error/30'}`}>
                        {doc.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant={doc.active ? 'danger' : 'secondary'}
                        size="sm"
                        isLoading={togglingId === doc.id}
                        onClick={() => { void handleToggle(doc.id, doc.active); }}
                      >
                        {doc.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {doctors.length === 0 && (
              <div className="text-center py-12 px-6 text-text-muted bg-surface-card border border-line rounded-2xl">
                No hay médicos registrados aún.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
