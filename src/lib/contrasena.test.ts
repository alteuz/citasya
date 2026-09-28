import { describe, expect, it, vi } from 'vitest';
import { problemaDeContrasena, vecesFiltrada } from './contrasena';

describe('problemaDeContrasena (NIST SP 800-63B)', () => {
  it('exige al menos 8 caracteres', () => {
    expect(problemaDeContrasena('corta')).toMatch(/al menos 8/);
    expect(problemaDeContrasena('suficiente')).toBeNull();
  });

  it('rechaza más de 72 bytes (límite de bcrypt)', () => {
    expect(problemaDeContrasena('a'.repeat(73))).toMatch(/demasiado larga/);
    expect(problemaDeContrasena('a'.repeat(72))).toBeNull();
  });

  it('rechaza contraseñas que contienen la cédula o el correo del usuario', () => {
    expect(problemaDeContrasena('clave1023456789', { cedula: '1023456789' })).toMatch(/cédula/);
    expect(problemaDeContrasena('MariaLopez2026', { correo: 'marialopez@correo.co' })).toMatch(/correo/);
  });

  it('no impone reglas de composición (una frase larga es válida)', () => {
    expect(problemaDeContrasena('mi perro se llama tobi')).toBeNull();
  });
});

describe('vecesFiltrada (k-anonimato)', () => {
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const respuestaRango = (cuerpo: string) =>
    vi.fn().mockResolvedValue(new Response(cuerpo, { status: 200 }));

  it('envía solo los 5 primeros caracteres del hash y detecta la filtración', async () => {
    const consultar = respuestaRango('0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n');
    await expect(vecesFiltrada('password', consultar)).resolves.toBe(9545824);
    const [url] = consultar.mock.calls[0] as [string];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    // Lo único que sale del navegador son 5 caracteres hexadecimales del hash.
    expect(new URL(url).pathname.split('/').pop()).toMatch(/^[0-9A-F]{5}$/);
  });

  it('devuelve 0 si la contraseña no aparece', async () => {
    await expect(vecesFiltrada('password', respuestaRango('0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n'))).resolves.toBe(0);
  });

  it('devuelve null (no bloquea) si el servicio falla', async () => {
    await expect(vecesFiltrada('password', vi.fn().mockRejectedValue(new Error('sin red')))).resolves.toBeNull();
    await expect(vecesFiltrada('password', vi.fn().mockResolvedValue(new Response('', { status: 503 })))).resolves.toBeNull();
  });
});
