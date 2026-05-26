"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { toggleFavourite } from "@/app/(account)/logbook/actions"

export default function FavouriteButton({
  jumpId,
  isFavourite,
}: {
  jumpId: string
  isFavourite: boolean
}) {
  const [fav, setFav] = useState(isFavourite)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggle = () => {
    const next = !fav
    setFav(next) // optimistic
    startTransition(async () => {
      const res = await toggleFavourite(jumpId, fav)
      if (res?.error) {
        setFav(fav) // revert on error
      } else {
        router.refresh() // clear router cache so list reflects the change
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={fav ? "Remove from favourites" : "Add to favourites"}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border text-sm transition-colors disabled:opacity-60 ${
        fav
          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/15"
          : "bg-surface-2 border-border text-fg-3 hover:bg-surface hover:text-fg"
      }`}
    >
      <Star className={`w-3.5 h-3.5 ${fav ? "fill-amber-400" : ""}`} />
      {fav ? "Starred" : "Favourite"}
    </button>
  )
}
