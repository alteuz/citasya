import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DoctorsService, type DoctorSearchResult, type SpecialtyOption, type EpsOption } from '@/services/doctors.service';
import { FamiliaService } from '@/services/familia.service';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useAuthContext } from '@/hooks/useAuthContext';
import { etiquetaParentesco } from '@/lib/familia';
import type { ServiceResult } from '@/types/common';
import { ArrowRight, ChevronDown, Search, SearchX, SlidersHorizontal, Stethoscope, TriangleAlert, UserRound } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

/** Valor de `?para=` cuando la cita es para el titular de la cuenta (RF-13). */
const PARA_TITULAR = 'yo';

interface SearchFiltersCatalog {
  readonly specialties: readonly SpecialtyOption[];
  readonly epsList: readonly EpsOption[];
}

/** Catálogos de filtros; si uno falla, ese filtro queda vacío sin bloquear la búsqueda. */
async function loadFiltersCatalog(): Promise<ServiceResult<SearchFiltersCatalog>> {
  const [specResult, epsResult] = await Promise.all([
    DoctorsService.getSpecialties(),
    DoctorsService.getEpsList(),
  ]);
  return {
    success: true,
    data: {
      specialties: specResult.success ? specResult.data : [],
      epsList: epsResult.success ? epsResult.data : [],
    },
  };
}

export function SearchPage() {
  // Filtros
  const { data: filters } = useServiceQuery(loadFiltersCatalog, []);
  const specialties = filters?.specialties ?? [];
  const epsList = filters?.epsList ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || '');
  const [selectedEps, setSelectedEps] = useState(searchParams.get('eps') || '');
  const [hasSearched, setHasSearched] = useState(() => {
    return !!(searchParams.get('specialty') || searchParams.get('eps'));
  });

  // ¿Para quién es la cita? (RF-13). Solo aparece si el titular tiene familiares.
  // Al elegir a una persona, la EPS por defecto es la suya.
  const { isAuthenticated, profile } = useAuthContext();
  const { data: familiares } = useServiceQuery(() => FamiliaService.listar(), [isAuthenticated], isAuthenticated);
  const conFamilia = isAuthenticated && (familiares?.length ?? 0) > 0;
  const [para, setPara] = useState(searchParams.get('para') || PARA_TITULAR);
  const familiarElegido = familiares?.find((f) => f.id === para) ?? null;
  const epsDePersona = familiarElegido ? familiarElegido.epsId : (profile?.epsId ?? '');
  const epsEfectiva = selectedEps || epsDePersona;

  // Resultados: se buscan al confirmar y, después, cada vez que cambian los filtros.
  // Una respuesta que llega tarde tras cambiar los filtros se descarta.
  const search = useServiceQuery(
    () => DoctorsService.searchDoctors({
      specialtyId: selectedSpecialty || undefined,
      epsId: epsEfectiva || undefined,
    }),
    [selectedSpecialty, epsEfectiva],
    hasSearched,
  );
  const doctors: readonly DoctorSearchResult[] = search.data ?? [];
  const error = search.error;
  const isSearching = search.isLoading;
  // Esqueleto solo en la primera carga; en búsquedas posteriores se mantienen los resultados previos.
  const isLoading = search.isLoading && search.data === null;

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
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (selectedSpecialty) {
        next.set('specialty', selectedSpecialty);
      } else {
        next.delete('specialty');
      }
      if (epsEfectiva) {
        next.set('eps', epsEfectiva);
      } else {
        next.delete('eps');
      }
      if (conFamilia) {
        next.set('para', para);
      }
      return next;
    });
  }, [selectedSpecialty, epsEfectiva, conFamilia, para, setSearchParams]);

  const elegirPersona = useCallback((valor: string) => {
    setPara(valor);
    // La EPS vuelve a ser la de la persona elegida.
    setSelectedEps('');
  }, []);

  const hasActiveFilters = selectedSpecialty !== '' || epsEfectiva !== '';
  // Parámetros que se conservan al abrir la agenda de un médico.
  const paramsAgenda = new URLSearchParams();
  if (conFamilia) paramsAgenda.set('para', para);
  if (searchParams.get('modo')) paramsAgenda.set('modo', searchParams.get('modo') ?? '');
  const consultaAgenda = paramsAgenda.toString();

  if (!hasSearched) {
    return (
      <div className="py-12 px-4">
        <div className="mx-auto max-w-2xl bg-surface-card border border-line rounded-3xl p-6 sm:p-8 md:p-12 shadow-elevated text-center">
          <IconBadge icon={Stethoscope} tone="brand" size="lg" className="mb-6" />
          <h1 className="text-3xl md:text-4xl text-text-primary mb-4">
            ¿Qué médico necesitas hoy?
          </h1>
          <p className="text-text-secondary text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Por favor, dinos qué especialidad buscas y tu EPS para mostrarte los doctores disponibles.
          </p>

          <div className="space-y-6 text-left mb-10">
            {/* Persona (RF-13): solo si el titular tiene familiares registrados */}
            {conFamilia && (
              <div className="flex flex-col gap-2">
                <label htmlFor="filter-para" className="text-base font-bold text-text-primary">
                  1. ¿Para quién es la cita?
                </label>
                <div className="relative">
                  <select
                    id="filter-para"
                    value={para}
                    onChange={(e) => elegirPersona(e.target.value)}
                    className="control-campo min-h-14 rounded-2xl border-2 px-5 py-4 text-base sm:text-lg appearance-none cursor-pointer pr-12 font-medium"
                  >
                    <option value={PARA_TITULAR}>Para mí</option>
                    {(familiares ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombreCompleto} ({etiquetaParentesco(f.parentesco)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-text-muted" aria-hidden="true">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>
            )}

            {/* Especialidad */}
            <div className="flex flex-col gap-2">
              <label htmlFor="filter-specialty" className="text-base font-bold text-text-primary">
                {conFamilia ? '2' : '1'}. Especialidad Médica
              </label>
              <div className="relative">
                <select
                  id="filter-specialty"
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="control-campo min-h-14 rounded-2xl border-2 px-5 py-4 text-base sm:text-lg appearance-none cursor-pointer pr-12 font-medium"
                >
                  <option value="">Selecciona una especialidad...</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-text-muted" aria-hidden="true">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {/* EPS */}
            <div className="flex flex-col gap-2">
              <label htmlFor="filter-eps" className="text-base font-bold text-text-primary">
                {conFamilia ? '3' : '2'}. Aseguradora (EPS)
              </label>
              <div className="relative">
                <select
                  id="filter-eps"
                  value={epsEfectiva}
                  onChange={(e) => setSelectedEps(e.target.value)}
                  className="control-campo min-h-14 rounded-2xl border-2 px-5 py-4 text-base sm:text-lg appearance-none cursor-pointer pr-12 font-medium"
                >
                  <option value="">Selecciona tu EPS...</option>
                  {epsList.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-text-muted" aria-hidden="true">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSearchSubmit}
            className="min-h-14 text-lg font-bold rounded-2xl"
          >
            <Search size={18} aria-hidden="true" /> Encontrar Médicos Disponibles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl text-text-primary">
              Médicos Disponibles
            </h1>
            <p className="text-text-secondary mt-1 flex flex-wrap gap-2 items-center">
              <span>Criterio seleccionado:</span>
              <span className="font-semibold px-2.5 py-1 bg-accent-soft text-accent border border-accent/30 rounded-full text-xs">
                {specialties.find(s => s.id === selectedSpecialty)?.name || 'Cualquier especialidad'}
              </span>
              <span className="text-text-secondary">•</span>
              <span className="font-semibold px-2.5 py-1 bg-accent-soft text-accent border border-accent/30 rounded-full text-xs">
                {epsList.find(e => e.id === epsEfectiva)?.name || 'Cualquier EPS'}
              </span>
              {familiarElegido && (
                <>
                  <span className="text-text-secondary">•</span>
                  <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 bg-accent-soft text-accent border border-accent/30 rounded-full text-xs">
                    <UserRound size={13} aria-hidden="true" /> Para: {familiarElegido.nombreCompleto}
                  </span>
                </>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHasSearched(false)}
              className="font-bold"
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Modificar Búsqueda
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="font-semibold"
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
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <IconBadge icon={TriangleAlert} tone="error" size="md" className="mb-4" />
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={search.reload} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && doctors.length === 0 && (
          <div className="bg-surface-card border border-line rounded-2xl p-10 text-center">
            <IconBadge icon={SearchX} size="lg" className="mb-5" />
            <h2 className="font-sans text-lg font-semibold text-text-primary mb-2">
              No se encontraron médicos
            </h2>
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
              <DoctorCard key={doctor.id} doctor={doctor} consulta={consultaAgenda} />
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
  /** Parámetros que se conservan en la agenda del médico (persona y modalidad). */
  readonly consulta: string;
}

function DoctorCard({ doctor, consulta }: DoctorCardProps) {
  const initials = doctor.fullName
    .split(' ')
    .filter((_, i) => i === 0 || i === 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="bg-surface-card border border-line rounded-2xl p-6 hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5 transicion flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-brand-soft text-accent border border-accent/20 font-bold text-lg flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="font-sans text-base font-semibold text-text-primary truncate">
            {doctor.fullName}
          </h2>
          <p className="text-sm text-accent font-medium">
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

      <Link to={`/buscar/${doctor.id}${consulta ? `?${consulta}` : ''}`}>
        <Button variant="primary" size="sm" fullWidth>
          Ver disponibilidad
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </Link>
    </div>
  );
}
