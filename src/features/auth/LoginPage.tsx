import '@fontsource/great-vibes'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useAuth } from './auth-context'
import { BotanicalIllustration } from './BotanicalIllustration'

// Same limits as the backend's login schema
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu usuario').max(16, 'Máximo 16 caracteres'),
  password: z.string().min(1, 'Ingresa tu contraseña').max(72, 'Máximo 72 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export type LoginLocationState = { from?: Location; sessionExpired?: boolean }

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return 'Usuario o contraseña incorrectos.'
  if (error instanceof ApiError && error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  }
  return 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.'
}

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as LoginLocationState
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Already logged in (e.g. opened /login by hand): go straight in
  if (state.status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = async (form: LoginForm) => {
    setSubmitError(null)
    try {
      await login(form.username, form.password)
      // Back to the page the user was on before the session ended, if any
      navigate(locationState.from ?? '/', { replace: true })
    } catch (error) {
      setSubmitError(loginErrorMessage(error))
    }
  }

  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr] md:grid-cols-2 md:grid-rows-1">
      {/* Green panel: a band with the shop name on phones; from tablets up, half the screen with the bouquet */}
      <aside className="relative overflow-hidden bg-primary px-6 py-5 text-primary-foreground md:p-12">
        <div className="relative z-10 flex flex-col gap-6">
          <span className="font-caps text-base tracking-[0.16em] uppercase md:text-lg">Floristería Barranquilla</span>
          <div className="hidden max-w-md flex-col gap-3 md:flex">
            <p className="font-script text-6xl leading-[1.05] text-balance">Detalles que hablan por ti 🌸</p>
            <p className="text-sm text-primary-foreground/80">Sistema de pedidos. Acceso solo para el personal.</p>
          </div>
        </div>
        <BotanicalIllustration className="pointer-events-none absolute right-0 bottom-0 hidden h-[80%] max-h-[720px] translate-y-[2%] md:block" />
      </aside>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-1">
            {/* Same face as the shop name on the green panel (it only has one weight) */}
            <h1 className="font-caps text-3xl tracking-normal">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Ingresa con tu usuario y contraseña.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {locationState.sessionExpired && !submitError && (
              <p role="status" className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                Tu sesión expiró. Inicia sesión de nuevo.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.username}
                {...register('username')}
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
