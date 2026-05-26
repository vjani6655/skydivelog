import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSidebar from '@/components/admin/sidebar'
import { Bell, Search } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service-role client to bypass RLS on admins table
  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('role, name')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()

  if (!adminRow) redirect('/')

  return (
    <div className="min-h-screen flex bg-bg text-fg font-sans">
      <AdminSidebar adminEmail={user.email!} adminName={adminRow.name ?? ''} adminRole={adminRow.role ?? 'admin'} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[52px] px-7 flex items-center gap-3.5 border-b border-border bg-bg shrink-0 sticky top-0 z-10">
          <span className="font-mono text-[11px] text-fg-3 tracking-widest">JUMP LOGS / ADMIN</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ok/10">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            <span className="font-mono text-[10px] text-ok tracking-widest">ALL SYSTEMS NORMAL</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface border border-border">
            <Search size={12} className="text-fg-3" />
            <span className="font-mono text-[11px] text-fg-3">SEARCH · ⌘K</span>
          </div>
          <Bell size={16} className="text-fg-2" />
        </header>

        <main className="flex-1 p-7">{children}</main>
      </div>
    </div>
  )
}
