import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            BadmintonBuddy
          </h1>
          <p className="text-lg text-muted-foreground">
            Find and book badminton courts near you
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/venues"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Discover Venues</h3>
              <p className="text-muted-foreground">
                Find badminton courts in your area
              </p>
            </div>
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2zm7 4h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H21v-2h2V9a3 3 0 0 0-3-3h-2V5z" />
            </svg>
          </Link>

          <Link
            href="/venues"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Search</h3>
              <p className="text-muted-foreground">
                Location, date, time, and court
              </p>
            </div>
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </Link>

          <Link
            href "/bookings/new"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Book Now</h3>
              <p className="text-muted-foreground">
                Select court, time, and duration
              </p>
            </div>
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5v14M5 12h14M17 2l2.29 6.86L12 19l-5-5 1.71-5.43L5 12l6.72-4.87L11 5l3.14 1.85L12 2l-6.29 3.85z" />
            </svg>
          </Link>
        </section>
      </div>
    </main>
  );
}