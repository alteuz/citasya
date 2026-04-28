/**
 * Estado asíncrono genérico para operaciones de datos.
 * Evita manejar loading/error/data de forma ad-hoc en cada componente.
 */
export interface AsyncState<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/**
 * Respuesta paginada genérica.
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Resultado de operación de servicio.
 * Patrón Result para evitar throw en flujos de negocio.
 */
export type ServiceResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };
