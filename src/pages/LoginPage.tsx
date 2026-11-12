import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Logo } from '@/components/marca/Logo';
import { PanelMarca } from '@/components/marca/PanelMarca';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading: authLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }
    if (!password) { setError('Ingresa tu contraseña.'); return; }

    setIsSubmitting(true);
    const errorMsg = await login({ email: email.trim(), password });
    setIsSubmitting(false);

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    navigate(from, { replace: true });
  }, [email, password, login, navigate, from]);

  return (
    // grid-cols-1 y min-w-0: la columna no crece más que la pantalla (igual que en el registro).
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:min-h-[calc(100svh-4.5rem)]">
      <div className="flex items-center justify-center min-w-0">
      <div className="w-full max-w-md min-w-0">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-6 rounded-xl">
            <Logo tamano="lg" />
          </Link>
          <h1 className="text-3xl sm:text-4xl text-text-primary mb-2">
            Iniciar sesión
          </h1>
          <p className="text-text-secondary">
            Accede a tu cuenta para gestionar tus citas médicas
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="vidrio rounded-3xl p-6 sm:p-8 space-y-5"
          noValidate
        >
          {/* Error global */}
          {error && (
            <div
              role="alert"
              className="bg-error-soft border border-error/30 text-error text-sm font-medium px-4 py-3 rounded-xl"
            >
              {error}
            </div>
          )}

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

          <Input
            label="Contraseña"
            type="password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting || authLoading}
          >
            Iniciar sesión
          </Button>

          <p className="text-center text-sm text-text-muted">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registrarse"
              className="text-accent hover:text-accent-hover font-semibold underline-offset-4 hover:underline rounded"
            >
              Regístrate gratis
            </Link>
          </p>
        </form>
      </div>
      </div>
      <PanelMarca />
    </div>
  );
}
