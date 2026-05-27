import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/hooks/useAuthContext';
import { supabase } from '@/lib/supabase';

interface EpsOption {
  readonly id: string;
  readonly name: string;
}

export function RegisterPage() {
  const { register, isLoading: authLoading } = useAuthContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [epsList, setEpsList] = useState<readonly EpsOption[]>([]);

  // Step 1 fields
  const [cedula, setCedula] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 fields
  const [email, setEmail] = useState('');
  const [epsId, setEpsId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Cargar lista de EPS al montar
  useEffect(() => {
    async function loadEps() {
      const { data, error: epsError } = await supabase
        .from('eps')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (!epsError && data) {
        setEpsList(data);
      }
    }
    void loadEps();
  }, []);

  const validateStep1 = useCallback((): boolean => {
    if (!cedula.trim()) { setError('Ingresa tu número de cédula.'); return false; }
    if (!/^\d{6,12}$/.test(cedula.trim())) { setError('La cédula debe tener entre 6 y 12 dígitos.'); return false; }
    if (!fullName.trim()) { setError('Ingresa tu nombre completo.'); return false; }
    if (fullName.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres.'); return false; }
    return true;
  }, [cedula, fullName]);

  const handleNextStep = useCallback(() => {
    setError(null);
    if (validateStep1()) {
      setStep(2);
    }
  }, [validateStep1]);

  const handlePrevStep = useCallback(() => {
    setError(null);
    setStep(1);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones step 2
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresa un correo electrónico válido.'); return; }
    if (!password) { setError('Ingresa una contraseña.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }

    setIsSubmitting(true);
    const errorMsg = await register({
      email: email.trim(),
      password,
      cedula: cedula.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      epsId,
    });
    setIsSubmitting(false);

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setSuccess(true);
  }, [email, password, confirmPassword, cedula, fullName, phone, epsId, register]);

  // Pantalla de éxito post-registro
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
        <div className="w-full max-w-md text-center">
          <span className="text-6xl mb-6 block" aria-hidden="true">🎉</span>
          <h1 className="text-3xl font-bold text-primary-800 mb-4">
            ¡Registro exitoso!
          </h1>
          <p className="text-text-secondary mb-2">
            Revisa tu correo electrónico para confirmar tu cuenta.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Si no ves el correo, revisa la carpeta de spam.
          </p>
          <Link to="/iniciar-sesion">
            <Button variant="primary" size="lg">
              Ir a iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="CitasYA" className="h-20 w-20 object-contain shrink-0" />
            <span className="font-serif text-[32px] tracking-tight font-normal text-text-primary">
              Citas<span className="text-accent-400">YA</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Crear cuenta
          </h1>
          <p className="text-text-secondary">
            Regístrate para agendar tus citas médicas
          </p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4" aria-label={`Paso ${step} de 2`}>
            <div className={`h-2 w-10 rounded-full transition-colors ${step >= 1 ? 'bg-accent-400' : 'bg-primary-200'}`} />
            <div className={`h-2 w-10 rounded-full transition-colors ${step >= 2 ? 'bg-accent-400' : 'bg-primary-200'}`} />
          </div>
          <p className="text-xs text-text-muted mt-2">Paso {step} de 2</p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="bg-surface-card rounded-2xl shadow-elevated p-8 space-y-5"
          noValidate
        >
          {/* Error global */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-xl"
            >
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <Input
                label="Número de cédula"
                type="text"
                name="cedula"
                placeholder="1234567890"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                inputMode="numeric"
                maxLength={12}
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                  </svg>
                }
              />

              <Input
                label="Nombre completo"
                type="text"
                name="fullName"
                placeholder="María Alejandra Rodríguez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <Input
                label="Teléfono (opcional)"
                type="tel"
                name="phone"
                placeholder="310 555 1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleNextStep}
              >
                Siguiente
                <span aria-hidden="true">→</span>
              </Button>
            </>
          ) : (
            <>
              <Input
                label="Correo electrónico"
                type="email"
                name="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              {/* EPS selector */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="eps" className="text-sm font-medium text-text-secondary">
                  EPS (opcional)
                </label>
                <select
                  id="eps"
                  value={epsId}
                  onChange={(e) => setEpsId(e.target.value)}
                  className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 hover:border-primary-300 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Seleccione su EPS</option>
                  {epsList.map((epsItem) => (
                    <option key={epsItem.id} value={epsItem.id}>
                      {epsItem.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Contraseña"
                type="password"
                name="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <Input
                label="Confirmar contraseña"
                type="password"
                name="confirmPassword"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handlePrevStep}
                  className="flex-1"
                >
                  <span aria-hidden="true">←</span>
                  Atrás
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting || authLoading}
                  className="flex-1"
                >
                  Crear cuenta
                </Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/iniciar-sesion"
              className="text-accent-500 hover:text-accent-600 font-semibold transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
