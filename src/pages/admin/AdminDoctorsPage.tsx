import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminDoctor, type CreateDoctorInput } from '@/services/admin.service';
import { DoctorsService, type SpecialtyOption, type EpsOption } from '@/services/doctors.service';

export function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<readonly AdminDoctor[]>([]);
  const [specialties, setSpecialties] = useState<readonly SpecialtyOption[]>([]);
  const [epsList, setEpsList] = useState<readonly EpsOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [docRes, specRes, epsRes] = await Promise.all([
      AdminService.getAllDoctors(),
      DoctorsService.getSpecialties(),
      DoctorsService.getEpsList(),
    ]);

    if (docRes.success) setDoctors(docRes.data);
    else setError(docRes.error);

    if (specRes.success) setSpecialties(specRes.data);
    if (epsRes.success) setEpsList(epsRes.data);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    void loadData();
  }, [formName, formLicense, formSpecialty, formEps, formPhone, formEmail, loadData]);

  const handleToggle = useCallback(async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    const result = await AdminService.toggleDoctorActive(id, !currentActive);
    setTogglingId(null);

    if (result.success) {
      void loadData();
    } else {
      alert(result.error);
    }
  }, [loadData]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="text-sm text-text-muted hover:text-primary-700 font-medium mb-4 flex items-center gap-1">
            <span aria-hidden="true">←</span> Volver al panel
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
              Gestión de Médicos 👨‍⚕️
            </h1>
            <Button variant="accent" size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Nuevo médico'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showForm && (
          <div className="bg-surface-card border border-primary-100 rounded-2xl p-6 mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">Registrar nuevo médico</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-name" className="text-sm font-medium text-text-secondary block mb-1">Nombre completo *</label>
                <input id="doc-name" type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors"
                  placeholder="Dr. Juan Pérez López" />
              </div>
              <div>
                <label htmlFor="doc-license" className="text-sm font-medium text-text-secondary block mb-1">Número de registro *</label>
                <input id="doc-license" type="text" value={formLicense} onChange={(e) => setFormLicense(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors"
                  placeholder="RM-12345" />
              </div>
              <div>
                <label htmlFor="doc-specialty" className="text-sm font-medium text-text-secondary block mb-1">Especialidad *</label>
                <select id="doc-specialty" value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors">
                  <option value="">Seleccionar...</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="doc-eps" className="text-sm font-medium text-text-secondary block mb-1">EPS *</label>
                <select id="doc-eps" value={formEps} onChange={(e) => setFormEps(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors">
                  <option value="">Seleccionar...</option>
                  {epsList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="doc-phone" className="text-sm font-medium text-text-secondary block mb-1">Teléfono</label>
                <input id="doc-phone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors"
                  placeholder="(601) 123-4567" />
              </div>
              <div>
                <label htmlFor="doc-email" className="text-sm font-medium text-text-secondary block mb-1">Email</label>
                <input id="doc-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors"
                  placeholder="doctor@email.com" />
              </div>
            </div>

            {formError && (
              <div role="alert" className="bg-red-50 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-xl mt-4">
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
          <div className="bg-surface-card border border-error/20 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => { void loadData(); }} className="mt-4">Reintentar</Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Nombre</th>
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Especialidad</th>
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">EPS</th>
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Registro</th>
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Estado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc.id} className="border-b border-primary-50 hover:bg-primary-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-primary-800">{doc.fullName}</td>
                    <td className="py-3 px-4 text-sm text-accent-500 font-medium">{doc.specialtyName}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{doc.epsName}</td>
                    <td className="py-3 px-4 text-sm text-text-muted">{doc.licenseNumber}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${doc.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {doc.active ? '✅ Activo' : '❌ Inactivo'}
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
              <div className="text-center py-12 text-text-muted">
                No hay médicos registrados aún.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
