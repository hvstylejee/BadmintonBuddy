import Link from "next/link";

export default function CustomerProfilePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Profile
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-lg bg-card p-6">
            <h3 className="text-xl font-medium mb-2">Account Details</h3>
            <p className="text-muted-foreground">
              Email: customer@badmintonbuddy.com
            </p>
            <p className="text-muted-foreground">
              Role: Customer
            </p>
          </div>

          <div className="rounded-lg bg-card p-6">
            <h3 className="text-xl font-medium mb-2">Favorites</h3>
            <p className="text-muted-foreground">
              No favorites yet
            </p>
          </div>

          <div className="rounded-lg bg-card p-6">
            <h3 className="text-xl font-medium mb-2">Settings</h3>
            <p className="text-muted-foreground">
              Notification preferences, privacy settings, etc.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/auth/signin" className="btn btn-primary">
            Sign In / Sign Up
          </Link>
          <Link href="/" className="btn btn-outline mt-2">
            Continue as Guest
          </Link>
        </div>
      </div>
    </main>
  );
}