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
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/bookings/upcoming"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Upcoming</h3>
              <p className="text-muted-foreground">
                Your future bookings
              </p>
            </div>
          </Link>

          <Link
            href="/bookings/past"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Past</h3>
              <p className="text-muted-foreground">
                Your completed bookings
              </p>
            </div>
          </Link>

          <Link
            href="/bookings/cancelled"
            className="group block rounded-lg overflow-hidden hover:bg-card hover:shadow-md transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-2">Cancelled</h3>
              <p className="text-muted-foreground">
                Your cancelled bookings
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}