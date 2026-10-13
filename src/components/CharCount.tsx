// Characters used out of the maximum, shown under a text area
export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="self-end text-xs text-muted-foreground tabular-nums">
      {value.length}/{max}
    </span>
  )
}
