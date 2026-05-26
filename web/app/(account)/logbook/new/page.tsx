import JumpForm from "@/components/JumpForm"

export default function NewJumpPage() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1.5">Logbook</p>
        <h1 className="text-[28px] font-bold text-fg tracking-tight">Log a jump</h1>
      </div>
      <div className="bg-surface border border-border rounded-[14px] p-6">
        <JumpForm />
      </div>
    </div>
  )
}
