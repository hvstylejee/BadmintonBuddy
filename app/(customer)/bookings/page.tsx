import Link from "next/link";

export default function CustomerBookingsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            My Bookings
          </h1>
          <p className="text-lg text-muted-foreground">
            View all your bookings here
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/bookings/upcoming"
            className="group rounded-2xl overflow-hidden bg-card border border-border hover:translate-y-1 hover:shadow-xl transition-all duration-300 group-hover:shadow-accent/30"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Upcoming</h3>
              <p className="text-muted-foreground">
                Your future bookings
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/bookings/past"
            className="group rounded-2xl overflow-hidden bg-card border border-hover hover:translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Past</h3>
              <p className="text-muted-foreground">
                Your completed bookings
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 7h16c.9 0 1.6.7 1.6 1.4v10c0 .9-.7 1.6-1.6 1.6H4.5l5.447-3.718a1 1 0 0 0 .28-.805 1 1 0 0 0-.805-.38L9 15H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 0V5a2 2 0 0 1 2-2h2v2h-2zm6 4c-.7 0-1.4.3-1.9.8l-6.25 4.17a1.5 1.5 0 0 0 .56 1.38l6.25-4.17a1.5 1.5 0 0 0-1.06-.08L14 15z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/bookings/cancelled"
            className="group rounded-2xl overflow-hidden bg-card border-border hover:translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Cancelled</h3>
              <p className="text-muted-foreground">
                Your cancelled bookings
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zm5.5 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM9 5v14M15 5v14" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}