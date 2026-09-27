import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useAuth } from './auth-context'

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
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Floristería</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {locationState.sessionExpired && !submitError && (
              <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
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
        </CardContent>
      </Card>
    </main>
  )
}
