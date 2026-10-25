import Link from "next/link";

export default function UpcomingBookingsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Upcoming Bookings
          </h1>
        </header>

        <div className="space-y-6">
          {/* Placeholder until we have API data */}
          <div className="rounded-lg bg-card p-6 text-center">
            <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5v14M5 12h14M17 2l2.29 6.86L12 19l-5-5 1.71-5.43L5 12l6.72-4.87L11 5l3.14 1.85L12 2l-6.29 3.85z" />
              </svg>
            </div>
            <p className="text-muted-foreground">
              No upcoming bookings found
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}