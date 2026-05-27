import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DoctorsService, type DoctorSearchResult, type SpecialtyOption, type EpsOption } from '@/services/doctors.service';

export function SearchPage() {
  // Filtros
  const [specialties, setSpecialties] = useState<readonly SpecialtyOption[]>([]);
  const [epsList, setEpsList] = useState<readonly EpsOption[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || '');
  const [selectedEps, setSelectedEps] = useState(searchParams.get('eps') || '');
  const [hasSearched, setHasSearched] = useState(() => {
    return !!(searchParams.get('specialty') || searchParams.get('eps'));
  });

  // Resultados
  const [doctors, setDoctors] = useState<readonly DoctorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar filtros al montar
  useEffect(() => {
    async function loadFilters() {
      const [specResult, epsResult] = await Promise.all([
        DoctorsService.getSpecialties(),
        DoctorsService.getEpsList(),
      ]);

      if (specResult.success) setSpecialties(specResult.data);
      if (epsResult.success) setEpsList(epsResult.data);
    }
    void loadFilters();
  }, []);

  // Búsqueda inicial y al cambiar filtros
  const searchDoctors = useCallback(async () => {
    setIsSearching(true);
    setError(null);

    const result = await DoctorsService.searchDoctors({
      specialtyId: selectedSpecialty || undefined,
      epsId: selectedEps || undefined,
    });

    if (result.success) {
      setDoctors(result.data);
    } else {
      setError(result.error);
    }

    setIsSearching(false);
    setIsLoading(false);
  }, [selectedSpecialty, selectedEps]);

  useEffect(() => {
    if (hasSearched) {
      void searchDoctors();
    } else {
      setIsLoading(false);
    }
  }, [hasSearched, searchDoctors]);

  const handleClearFilters = useCallback(() => {
    setSelectedSpecialty('');
    setSelectedEps('');
    setHasSearched(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('specialty');
      next.delete('eps');
      return next;
    });
  }, [setSearchParams]);

  const handleSearchSubmit = useCallback(() => {
    setHasSearched(true);
    setIsLoading(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (selectedSpecialty) {
        next.set('specialty', selectedSpecialty);
      } else {
        next.delete('specialty');
      }
      if (selectedEps) {
        next.set('eps', selectedEps);
      } else {
        next.delete('eps');
      }
      return next;
    });
  }, [selectedSpecialty, selectedEps, setSearchParams]);

  const hasActiveFilters = selectedSpecialty !== '' || selectedEps !== '';

  if (!hasSearched) {
    return (
      <div className="animate-fade-in py-12 px-4">
        <div className="mx-auto max-w-2xl bg-surface-card border-2 border-primary-100 rounded-[2.5rem] p-8 md:p-12 shadow-xl text-center">
          <span className="text-6xl mb-6 block" aria-hidden="true">🩺</span>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-950 mb-4">
            ¿Qué médico necesitas hoy?
          </h1>
          <p className="text-text-secondary text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Por favor, dinos qué especialidad buscas y tu EPS para mostrarte los doctores disponibles.
          </p>

          <div className="space-y-6 text-left mb-10">
            {/* Especialidad */}
            <div className="flex flex-col gap-2">
              <label htmlFor="filter-specialty" className="text-base font-bold text-primary-900">
                1. Especialidad Médica
              </label>
              <div className="relative">
                <select
                  id="filter-specialty"
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full rounded-2xl border-2 border-primary-200 bg-surface-card px-5 py-4 text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 hover:border-primary-350 transition-all appearance-none cursor-pointer pr-12 font-medium"
                >
                  <option value="">Selecciona una especialidad...</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-primary-500 font-bold" aria-hidden="true">
                  ▼
                </div>
              </div>
            </div>

            {/* EPS */}
            <div className="flex flex-col gap-2">
              <label htmlFor="filter-eps" className="text-base font-bold text-primary-900">
                2. Aseguradora (EPS)
              </label>
              <div className="relative">
                <select
                  id="filter-eps"
                  value={selectedEps}
                  onChange={(e) => setSelectedEps(e.target.value)}
                  className="w-full rounded-2xl border-2 border-primary-200 bg-surface-card px-5 py-4 text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 hover:border-primary-350 transition-all appearance-none cursor-pointer pr-12 font-medium"
                >
                  <option value="">Selecciona tu EPS...</option>
                  {epsList.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-primary-500 font-bold" aria-hidden="true">
                  ▼
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="accent"
            size="lg"
            fullWidth
            onClick={handleSearchSubmit}
            className="py-4.5 text-lg font-bold rounded-2xl shadow-lg shadow-accent-400/25 hover:shadow-accent-400/40 cursor-pointer"
          >
            🔍 Encontrar Médicos Disponibles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
              Médicos Disponibles
            </h1>
            <p className="text-text-secondary mt-1 flex flex-wrap gap-2 items-center">
              <span>Criterio seleccionado:</span>
              <span className="font-semibold px-2 py-0.5 bg-primary-100 rounded-md text-primary-850 text-xs">
                {specialties.find(s => s.id === selectedSpecialty)?.name || 'Cualquier especialidad'}
              </span>
              <span className="text-primary-300">•</span>
              <span className="font-semibold px-2 py-0.5 bg-primary-100 rounded-md text-primary-850 text-xs">
                {epsList.find(e => e.id === selectedEps)?.name || 'Cualquier EPS'}
              </span>
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHasSearched(false)}
              className="font-bold border-2 border-primary-800 text-primary-850 hover:bg-primary-100 cursor-pointer"
            >
              ✏️ Modificar Búsqueda
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-primary-600 font-semibold cursor-pointer"
            >
              Limpiar y Volver
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {isSearching ? 'Buscando...' : `${doctors.length} médico${doctors.length !== 1 ? 's' : ''} encontrado${doctors.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="220px" rounded="2xl" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-surface-card border border-error/20 rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block" aria-hidden="true">⚠️</span>
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => { void searchDoctors(); }} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && doctors.length === 0 && (
          <div className="bg-surface-card border border-primary-100 rounded-2xl p-10 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">🔍</span>
            <h3 className="text-lg font-semibold text-primary-800 mb-2">
              No se encontraron médicos
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Intenta cambiar los filtros de búsqueda o selecciona otra especialidad.
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" size="md" onClick={handleClearFilters}>
                Modificar filtros
              </Button>
            )}
          </div>
        )}

        {/* Doctor cards */}
        {!isLoading && !error && doctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} modeParam={searchParams.get('modo')} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DoctorCard ─────────────────────────────────────────────────────────────

interface DoctorCardProps {
  readonly doctor: DoctorSearchResult;
  readonly modeParam: string | null;
}

function DoctorCard({ doctor, modeParam }: DoctorCardProps) {
  const initials = doctor.fullName
    .split(' ')
    .filter((_, i) => i === 0 || i === 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="bg-surface-card border border-primary-100 rounded-2xl p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-800 font-bold text-lg flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary-800 truncate">
            {doctor.fullName}
          </h3>
          <p className="text-sm text-accent-500 font-medium">
            {doctor.specialtyName}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-5 flex-1">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-4 h-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="truncate">{doctor.epsName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-4 h-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
          </svg>
          <span>Reg. {doctor.licenseNumber}</span>
        </div>
      </div>

      <Link to={`/buscar/${doctor.id}${modeParam ? `?modo=${modeParam}` : ''}`}>
        <Button variant="accent" size="sm" fullWidth>
          Ver disponibilidad
          <span aria-hidden="true">→</span>
        </Button>
      </Link>
    </div>
  );
}
