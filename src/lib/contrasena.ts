/**
 * Validación de contraseñas según NIST SP 800-63B (rev. 3/4):
 * - longitud mínima de 8 caracteres y máxima de 72 (límite de bcrypt, que usa
 *   Supabase Auth: los bytes posteriores se ignorarían);
 * - no debe contener datos del propio usuario (cédula, correo);
 * - no debe figurar en listas de contraseñas filtradas;
 * - sin reglas arbitrarias de composición (NIST las desaconseja).
 *
 * La verificación de contraseñas filtradas es una medida compensatoria: la
 * protección equivalente de Supabase Auth solo existe en el plan Pro y el
 * proyecto usa el plan gratuito (hallazgo H-23). Se hace en el navegador con
 * k-anonimato: solo se envían los 5 primeros caracteres del hash SHA-1 al
 * servicio Pwned Passwords de HaveIBeenPwned; la contraseña nunca sale del
 * equipo del paciente.
 */

export const LONGITUD_MINIMA = 8;
export const BYTES_MAXIMOS = 72;

export interface DatosDelUsuario {
  readonly cedula?: string;
  readonly correo?: string;
}

/** Primer problema encontrado en la contraseña, o null si cumple las reglas locales. */
export function problemaDeContrasena(contrasena: string, datos: DatosDelUsuario = {}): string | null {
  if (contrasena.length < LONGITUD_MINIMA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`;
  }
  if (new TextEncoder().encode(contrasena).length > BYTES_MAXIMOS) {
    return 'La contraseña es demasiado larga (máximo 72 caracteres).';
  }
  const normalizada = contrasena.toLowerCase();
  const cedula = datos.cedula?.trim() ?? '';
  if (cedula.length >= 5 && normalizada.includes(cedula)) {
    return 'La contraseña no debe contener tu número de cédula.';
  }
  const usuarioCorreo = datos.correo?.trim().toLowerCase().split('@')[0] ?? '';
  if (usuarioCorreo.length >= 4 && normalizada.includes(usuarioCorreo)) {
    return 'La contraseña no debe contener tu correo electrónico.';
  }
  return null;
}

async function sha1Hex(texto: string): Promise<string> {
  const huella = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Cuántas veces aparece la contraseña en filtraciones conocidas (0 si no
 * aparece). Devuelve null si el servicio no responde: en ese caso no se
 * bloquea el registro, porque la disponibilidad de un tercero no debe impedir
 * que un paciente cree su cuenta.
 */
export async function vecesFiltrada(
  contrasena: string,
  consultar: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const hash = await sha1Hex(contrasena);
    const prefijo = hash.slice(0, 5);
    const sufijo = hash.slice(5);
    const respuesta = await consultar(`https://api.pwnedpasswords.com/range/${prefijo}`, {
      headers: { 'Add-Padding': 'true' }, // respuestas de tamaño uniforme
    });
    if (!respuesta.ok) return null;
    for (const linea of (await respuesta.text()).split('\n')) {
      const [candidato, veces] = linea.trim().split(':');
      if (candidato === sufijo) return Number(veces) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}
