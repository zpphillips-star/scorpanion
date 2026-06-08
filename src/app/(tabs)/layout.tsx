import BottomNav from '@/components/BottomNav'
import InstallPrompt from '@/components/InstallPrompt'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen lg:flex-row pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Desktop sidebar nav */}
      <div className="hidden lg:block lg:w-16 xl:w-20 shrink-0" />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
