import BottomNav from "@/components/BottomNav"

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col min-h-screen lg:flex-row"
      style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      {/* Desktop sidebar spacer */}
      <div className="hidden lg:block lg:w-16 xl:w-20 shrink-0" />
      <main className="flex-1 min-w-0 overflow-y-auto" style={{ maxWidth: "100vw" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
