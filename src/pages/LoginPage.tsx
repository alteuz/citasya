import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/hooks/useAuthContext';

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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="" className="h-20 w-20 object-contain shrink-0" />
            <span className="font-serif text-[32px] tracking-tight font-normal text-text-primary">
              Citas<span className="text-accent-400">YA</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Iniciar sesión
          </h1>
          <p className="text-text-secondary">
            Accede a tu cuenta para gestionar tus citas médicas
          </p>
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
              className="text-accent-500 hover:text-accent-600 font-semibold transition-colors"
            >
              Regístrate gratis
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
