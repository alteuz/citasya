/**
 * Validación y acceso tipado a variables de entorno.
 * Falla de forma ruidosa y descriptiva si faltan credenciales.
 */

class EnvValidationError extends Error {
  constructor(variableName: string) {
    super(
      `Variable de entorno "${variableName}" no está configurada. ` +
      `Copia .env.example a .env y configura los valores requeridos.`
    );
    this.name = 'EnvValidationError';
  }
}

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value || value.trim() === '') {
    throw new EnvValidationError(key);
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return requireEnv('VITE_SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return requireEnv('VITE_SUPABASE_ANON_KEY');
  },
} as const;
