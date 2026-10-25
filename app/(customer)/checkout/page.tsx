import { useForm } from "react-hook-form";
import { z } from "zod";
import { calculatePrice } from "@/server/domain/pricing/pricing.service";
import { createHold } from "@/server/domain/booking/booking.service";
import { useSearchParams, useParams, useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const venueId = searchParams.get("venueId") || params.venueId;
  const courtId = searchParams.get("courtId") || params.courtId;
  const startAt = searchParams.get("startAt") || params.startAt;
  const endAt = searchParams.get("endAt") || params.endAt;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Schema for checkout validation
  const checkoutSchema = z.object({
    courtId: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    duration: z.number(),
  });

  const onSubmit = async (data: any) => {
    try {
      // 1. Calculate price
      const priceResult = await calculatePrice({
        venueId,
        courtId,
        startAt,
        endAt,
      });

      // 2. Create hold on inventory
      const holdResult = await createHold({
        userId: "user_123", // In real app, get from auth
        venueId,
        courtId,
        startAt,
        endAt,
        duration: 60,
      });

      // 3. Redirect to payment page
      router.push(`/payment/${holdResult.bookingId}?holdId=${holdResult.holdId}`);
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  if (!venueId || !courtId || !startAt || !endAt) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-md mx-auto py-12">
          <h2 className="text-2xl font-bold mb-4">
            Booking Error
          </h2>
          <p className="text-muted-foreground">
            Missing booking details. Please go back and select a slot again.
          </p>
          <Link
            href="/"
            className="btn btn-primary mt-4"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-card p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Review Booking
          </h2>
          <p className="text-muted-foreground">
            Confirm the details before payment
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="courtId" value={courtId} />
          <input type="hidden" name="startAt" value={startAt} />
          <input type="hidden" name="endAt" value={endAt} />

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Court</h3>
              <p className="text-muted-foreground">
                Court {courtId}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Date & Time</h3>
              <p className="text-lg">
                {new Date(startAt).toLocaleDateString()} at{'
                '}
                {new Date(startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                -
                {new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Duration</h3>
              <p className="text-lg">
                {(Number(endAt.split('T')[1].split(':')[0]) * 60 + Number(endAt.split('T')[1].split(':')[1]) - Number(startAt.split('T')[1].split(':')[0]) * 60 - Number(startAt.split('T')[1].split(':')[1])) / 60} hours
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-2">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base Price</span>
                <span>₹{/* Will be filled by price calculation */}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>₹20</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Discount</span>
                <span>-₹0</span>
              </div>
              <hr className="my-2 border-b" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{/* Will be filled */}</span>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full btn btn-primary">
            Proceed to Payment
          </button>
        </form>
      </div>
    </main>
  );
}