import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              BadmintonBuddy
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Find and book badminton courts near you
            </p>
          </div>
          <div className="hidden sm:block sm:mt-0 sm:mr-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft text-accent text-sm">
              🏸
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Link
            href="/venues"
            className="group rounded-2xl overflow-hidden bg-card border border-border hover:translate-y-1 hover:shadow-xl transition-all duration-300 group-hover:shadow-accent/30"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Discover Venues</h3>
              <p className="text-muted-foreground flex-1">
                Find badminton courts in your area
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2zm7 4h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H21v-2h2V9a3 3 0 0 0-3-3h-2V5z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/venues"
            className="group rounded-2xl overflow-hidden bg-card border border:hover hover:translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Search</h3>
              <p className="text-muted-foreground flex-1">
                Location, date, time, and court
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/bookings/new"
            className="group rounded-2xl overflow-hidden bg-card border border-border hover:translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-medium mb-2">Book Now</h3>
              <p className="text-muted-foreground flex-1">
                Select court, time, and duration
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <svg className="w-6 h-6 mt-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5v14M5 12h14M17 2l2.29 6.86L12 19l-5-5 1.71-5.43L5 12l6.72-4.87L11 5l3.14 1.85L12 2l-6.29 3.85z" />
              </svg>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}