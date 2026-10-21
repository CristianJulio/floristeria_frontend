import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// The old way to copy: select the text in a hidden box and run the browser's copy command
function copyWithTextBox(text: string) {
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.style.position = 'fixed'
  box.style.opacity = '0'
  document.body.appendChild(box)
  box.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(box)
  }
}

// Whether the text was copied. navigator.clipboard only exists on secure pages (https or localhost);
// elsewhere the older way, through a hidden text box, still works
export async function copyText(text: string) {
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(text)
    else if (!copyWithTextBox(text)) throw new Error('copy failed')
    return true
  } catch {
    return copyWithTextBox(text)
  }
}

// A button that copies `text` and says so for a moment
export function CopyButton({ text, label, icon }: { text: string; label: string; icon?: ReactNode }) {
  const [result, setResult] = useState<'copied' | 'failed' | null>(null)

  // The confirmation goes back to the label after a moment
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setResult(null), 2000)
    return () => clearTimeout(timer)
  }, [result])

  async function copy() {
    setResult((await copyText(text)) ? 'copied' : 'failed')
  }

  return (
    <Button size="sm" variant="outline" onClick={copy}>
      {result === 'copied' ? <CheckIcon aria-hidden /> : (icon ?? <CopyIcon aria-hidden />)}
      <span aria-live="polite">
        {result === 'copied' ? 'Copiado' : result === 'failed' ? 'No se pudo copiar' : label}
      </span>
    </Button>
  )
}
