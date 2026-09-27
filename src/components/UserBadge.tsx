import type { User, UserRole } from '@/features/auth/auth-api'

// Who is logged in: a circle with their initials, their name and, below it, their role
export function UserBadge({ user, role }: { user: User; role: UserRole | null }) {
  const initials = `${user.name.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
        aria-hidden
      >
        {initials}
      </span>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate text-sm font-medium text-foreground">
          {user.name} {user.lastName}
        </span>
        {role && <span className="truncate text-xs text-muted-foreground">{role.name}</span>}
      </span>
    </span>
  )
}
