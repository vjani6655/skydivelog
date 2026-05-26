import JumpForm from "@/components/JumpForm"

export default function NewJumpPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Log a jump</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <JumpForm />
      </div>
    </div>
  )
}
