import type { LucideIcon } from 'lucide-react'

// Shown in place of a list with nothing to show: an icon, what's happening, and optionally what to try
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <Icon className="size-8 text-primary/60" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
