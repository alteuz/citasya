import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import type { EpsOption } from '@/services/doctors.service';
import { FamiliaService } from '@/services/familia.service';
import type { Familiar, Parentesco, TipoDocumento } from '@/types/database';
import {
  PARENTESCOS,
  TIPOS_DOCUMENTO,
  edadEnAnios,
  hoyEnBogota,
  tipoDocumentoSugerido,
  validarFamiliar,
  type DatosFamiliar,
  type ErroresFamiliar,
} from '@/lib/familia';

interface FormularioFamiliarProps {
  /** Familiar a editar. Si no se indica, el formulario registra uno nuevo. */
  readonly familiar?: Familiar;
  /** EPS que se propone para un familiar nuevo: la del titular. */
  readonly epsTitular: string;
  readonly listaEps: readonly EpsOption[];
  readonly onGuardado: (nombre: string) => void;
  readonly onCancelar: () => void;
}

/** Orden de los campos. Si hay errores, el foco va al primero que tenga uno. */
const ORDEN_CAMPOS: ReadonlyArray<keyof DatosFamiliar> = [
  'nombreCompleto', 'parentesco', 'fechaNacimiento', 'tipoDocumento', 'numeroDocumento', 'epsId', 'autorizacion',
];

const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

/** Registro o edición de un familiar a cargo (RF-13). */
export function FormularioFamiliar({ familiar, epsTitular, listaEps, onGuardado, onCancelar }: FormularioFamiliarProps) {
  const esNuevo = !familiar;
  const prefijo = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [hoy] = useState(() => hoyEnBogota());
  const [datos, setDatos] = useState<DatosFamiliar>(() => ({
    nombreCompleto: familiar?.nombreCompleto ?? '',
    tipoDocumento: familiar?.tipoDocumento ?? '',
    numeroDocumento: familiar?.numeroDocumento ?? '',
    fechaNacimiento: familiar?.fechaNacimiento ?? '',
    parentesco: familiar?.parentesco ?? '',
    epsId: familiar?.epsId ?? epsTitular,
    autorizacion: false,
  }));
  // Mientras la persona no elija el tipo de documento, se le sugiere uno según la edad.
  const [tipoElegido, setTipoElegido] = useState(!esNuevo);
  const [tipoSugerido, setTipoSugerido] = useState(false);
  const [errores, setErrores] = useState<ErroresFamiliar>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const idDe = (campo: keyof DatosFamiliar) => `${prefijo}-${campo}`;
  const errorDe = (campo: keyof DatosFamiliar) => errores[campo];

  function cambiar<K extends keyof DatosFamiliar>(campo: K, valor: DatosFamiliar[K]) {
    let sugerencia: Partial<DatosFamiliar> = {};
    if (campo === 'fechaNacimiento' && !tipoElegido && typeof valor === 'string' && FECHA_COMPLETA.test(valor)) {
      sugerencia = { tipoDocumento: tipoDocumentoSugerido(edadEnAnios(valor)) };
      setTipoSugerido(true);
    }
    if (campo === 'tipoDocumento') {
      setTipoElegido(true);
      setTipoSugerido(false);
    }
    setDatos((prev) => ({ ...prev, ...sugerencia, [campo]: valor }));
    setErrores((prev) => {
      const { [campo]: _resuelto, ...resto } = prev;
      return resto;
    });
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const encontrados = validarFamiliar(datos, { esNuevo });
    setErrores(encontrados);
    setErrorServidor(null);

    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo]);
    if (primero) {
      formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }

    setGuardando(true);
    const resultado = await FamiliaService.guardar(
      {
        nombreCompleto: datos.nombreCompleto.trim().replace(/\s+/g, ' '),
        tipoDocumento: datos.tipoDocumento as TipoDocumento,
        numeroDocumento: datos.numeroDocumento.trim().toUpperCase(),
        fechaNacimiento: datos.fechaNacimiento,
        parentesco: datos.parentesco as Parentesco,
        epsId: datos.epsId,
        autorizacion: datos.autorizacion,
      },
      familiar?.id,
    );
    setGuardando(false);

    if (!resultado.success) {
      setErrorServidor(resultado.error);
      return;
    }
    onGuardado(datos.nombreCompleto.trim().replace(/\s+/g, ' '));
  }

  const etiqueta = 'block text-sm font-semibold text-text-primary mb-1.5';
  const ayuda = 'mt-1 text-sm text-text-secondary';
  const mensajeError = 'mt-1 text-sm font-medium text-error';
  // aria-describedby: primero el error (si hay) y luego la ayuda (si hay).
  const describe = (campo: keyof DatosFamiliar, conAyuda = false) =>
    [errorDe(campo) ? `${idDe(campo)}-error` : '', conAyuda ? `${idDe(campo)}-ayuda` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => { void enviar(e); }}
      className="bg-surface-card border border-line rounded-2xl p-5 sm:p-6"
      aria-labelledby={`${prefijo}-titulo`}
    >
      <h2 id={`${prefijo}-titulo`} className="font-sans text-lg font-semibold text-text-primary mb-1">
        {esNuevo ? 'Agregar un familiar' : `Editar los datos de ${familiar?.nombreCompleto ?? ''}`}
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Todos los campos son obligatorios y solo se usan para pedir y gestionar sus citas.
      </p>

      {errorServidor && (
        <div role="alert" className="mb-5 px-4 py-3 bg-error-soft text-error text-sm font-medium rounded-xl border border-error/30">
          {errorServidor}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor={idDe('nombreCompleto')} className={etiqueta}>Nombre completo</label>
          <input
            id={idDe('nombreCompleto')}
            name="nombreCompleto"
            type="text"
            autoComplete="off"
            maxLength={120}
            value={datos.nombreCompleto}
            onChange={(e) => cambiar('nombreCompleto', e.target.value)}
            aria-invalid={Boolean(errorDe('nombreCompleto'))}
            aria-describedby={describe('nombreCompleto')}
            className="control-campo"
          />
          {errorDe('nombreCompleto') && <p id={`${idDe('nombreCompleto')}-error`} className={mensajeError}>{errorDe('nombreCompleto')}</p>}
        </div>

        <div>
          <label htmlFor={idDe('parentesco')} className={etiqueta}>Parentesco</label>
          <select
            id={idDe('parentesco')}
            name="parentesco"
            value={datos.parentesco}
            onChange={(e) => cambiar('parentesco', e.target.value as Parentesco | '')}
            aria-invalid={Boolean(errorDe('parentesco'))}
            aria-describedby={describe('parentesco')}
            className="control-campo"
          >
            <option value="">Selecciona…</option>
            {PARENTESCOS.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
          {errorDe('parentesco') && <p id={`${idDe('parentesco')}-error`} className={mensajeError}>{errorDe('parentesco')}</p>}
        </div>

        <div>
          <label htmlFor={idDe('fechaNacimiento')} className={etiqueta}>Fecha de nacimiento</label>
          <input
            id={idDe('fechaNacimiento')}
            name="fechaNacimiento"
            type="date"
            min="1900-01-01"
            max={hoy}
            value={datos.fechaNacimiento}
            onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
            aria-invalid={Boolean(errorDe('fechaNacimiento'))}
            aria-describedby={describe('fechaNacimiento')}
            className="control-campo"
          />
          {errorDe('fechaNacimiento') && <p id={`${idDe('fechaNacimiento')}-error`} className={mensajeError}>{errorDe('fechaNacimiento')}</p>}
        </div>

        <div>
          <label htmlFor={idDe('tipoDocumento')} className={etiqueta}>Tipo de documento</label>
          <select
            id={idDe('tipoDocumento')}
            name="tipoDocumento"
            value={datos.tipoDocumento}
            onChange={(e) => cambiar('tipoDocumento', e.target.value as TipoDocumento | '')}
            aria-invalid={Boolean(errorDe('tipoDocumento'))}
            aria-describedby={describe('tipoDocumento', tipoSugerido)}
            className="control-campo"
          >
            <option value="">Selecciona…</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
          {errorDe('tipoDocumento') && <p id={`${idDe('tipoDocumento')}-error`} className={mensajeError}>{errorDe('tipoDocumento')}</p>}
          {tipoSugerido && <p id={`${idDe('tipoDocumento')}-ayuda`} className={ayuda}>Sugerido según la edad; puedes cambiarlo.</p>}
        </div>

        <div>
          <label htmlFor={idDe('numeroDocumento')} className={etiqueta}>Número de documento</label>
          <input
            id={idDe('numeroDocumento')}
            name="numeroDocumento"
            type="text"
            autoComplete="off"
            maxLength={15}
            value={datos.numeroDocumento}
            onChange={(e) => cambiar('numeroDocumento', e.target.value)}
            aria-invalid={Boolean(errorDe('numeroDocumento'))}
            aria-describedby={describe('numeroDocumento', true)}
            className="control-campo"
          />
          {errorDe('numeroDocumento') && <p id={`${idDe('numeroDocumento')}-error`} className={mensajeError}>{errorDe('numeroDocumento')}</p>}
          <p id={`${idDe('numeroDocumento')}-ayuda`} className={ayuda}>Escríbelo sin puntos ni espacios.</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={idDe('epsId')} className={etiqueta}>EPS de tu familiar</label>
          <select
            id={idDe('epsId')}
            name="epsId"
            value={datos.epsId}
            onChange={(e) => cambiar('epsId', e.target.value)}
            aria-invalid={Boolean(errorDe('epsId'))}
            aria-describedby={describe('epsId', true)}
            className="control-campo"
          >
            <option value="">Selecciona su EPS…</option>
            {listaEps.map((eps) => <option key={eps.id} value={eps.id}>{eps.name}</option>)}
          </select>
          {errorDe('epsId') && <p id={`${idDe('epsId')}-error`} className={mensajeError}>{errorDe('epsId')}</p>}
          <p id={`${idDe('epsId')}-ayuda`} className={ayuda}>Puede ser la misma tuya o una distinta.</p>
        </div>

        {esNuevo && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <input
                id={idDe('autorizacion')}
                name="autorizacion"
                type="checkbox"
                checked={datos.autorizacion}
                onChange={(e) => cambiar('autorizacion', e.target.checked)}
                aria-invalid={Boolean(errorDe('autorizacion'))}
                aria-describedby={describe('autorizacion')}
                className="mt-1 h-5 w-5 shrink-0 accent-brand cursor-pointer"
              />
              <label htmlFor={idDe('autorizacion')} className="text-sm text-text-primary cursor-pointer">
                Soy su representante legal o tengo su autorización para registrar sus datos y pedir sus citas
                (Ley 1581 de 2012).
              </label>
            </div>
            {errorDe('autorizacion') && <p id={`${idDe('autorizacion')}-error`} className={mensajeError}>{errorDe('autorizacion')}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-5 border-t border-line">
        <Button type="button" variant="ghost" size="md" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" size="md" isLoading={guardando}>
          {esNuevo ? 'Guardar familiar' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
