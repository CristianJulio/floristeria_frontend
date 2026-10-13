import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ProductPlaceholder } from './ProductPlaceholder'

type Props = {
  name: string
  imageUrl: string | null
  // Without a picture, show a placeholder (lists of products) or nothing (an order's lines)
  showPlaceholder?: boolean
}

// A product's thumbnail. Hovering it shows a larger preview next to it, and clicking opens the picture
// at full size, so staff can see the arrangement (on phones, where there is no hover, the click does it)
export function ProductImage({ name, imageUrl, showPlaceholder = true }: Props) {
  const [broken, setBroken] = useState(false)
  const [open, setOpen] = useState(false)
  if (!imageUrl || broken) return showPlaceholder ? <ProductPlaceholder className="size-10 shrink-0" /> : null
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`Ver imagen de ${name}`}
              className="shrink-0 cursor-zoom-in rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => setOpen(true)}
            />
          }
        >
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="size-10 rounded-md object-cover"
            onError={() => setBroken(true)}
          />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-none border bg-card p-1.5 text-foreground shadow-lg">
          <img src={imageUrl} alt="" className="size-72 rounded-md object-cover" />
          <div className="px-1 pt-1.5 pb-0.5 text-sm font-medium">{name}</div>
        </TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-8">{name}</DialogTitle>
          </DialogHeader>
          <img src={imageUrl} alt={name} className="max-h-[70vh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
