import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "BadmintonBuddy",
  description: "Badminton Court Booking Platform",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}