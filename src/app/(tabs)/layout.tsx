import BottomNav from '@/components/BottomNav'
import InstallPrompt from '@/components/InstallPrompt'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
