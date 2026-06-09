import BottomNav from "@/components/BottomNav"

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen lg:flex-row" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <div className="hidden lg:block lg:w-16 xl:w-20 shrink-0" />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
