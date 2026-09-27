import { SearchIcon } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'

// Search box with a magnifier icon; the label is for screen readers
export function SearchInput({ label, className, ...props }: { label: string } & React.ComponentProps<'input'>) {
  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input type="search" aria-label={label} className="h-8 bg-card pl-8" {...props} />
    </div>
  )
}
