import { Loader2Icon } from 'lucide-react'
import { cn } from 'cn'

// A spinning icon with a message while something loads. Centred with room around it by default;
// `inline` keeps it in line with surrounding content (inside a card or dialog)
export function LoadingState({ label, inline = false }: { label: string; inline?: boolean }) {
  return (
    <p
      role="status"
      className={cn('flex items-center gap-2 text-sm text-muted-foreground', !inline && 'justify-center py-12')}
    >
      <Loader2Icon className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      {label}
    </p>
  )
}
