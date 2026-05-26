import Link from "next/link"
import type { Jump } from "@/lib/types"

interface Props {
  jump: Jump
}

export default function JumpCard({ jump }: Props) {
  return (
    <Link
      href={`/logbook/${jump.id}`}
      className="block bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-gray-400 w-10">
            #{jump.jump_number}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {jump.location}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {jump.aircraft} &middot;{" "}
              {jump.altitude_ft.toLocaleString()} ft &middot;{" "}
              {jump.freefall_seconds}s freefall
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-400 shrink-0">{jump.date}</span>
      </div>
      {jump.description && (
        <p className="mt-2 text-xs text-gray-500 truncate">
          {jump.description}
        </p>
      )}
    </Link>
  )
}
