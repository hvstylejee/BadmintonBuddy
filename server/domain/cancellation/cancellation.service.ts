import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";

export async function cancelBooking(userId: string, bookingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, userId, status: "CONFIRMED" }, include: { items: true, payments: true } });
    if (!booking) throw new ApiError("BOOKING_NOT_CANCELLABLE", "This booking cannot be cancelled.", 409);
    const startAt = booking.items[0]?.startAt; if (!startAt || startAt <= new Date()) throw new ApiError("BOOKING_NOT_CANCELLABLE", "Past bookings cannot be cancelled.", 409);
    const hours = (startAt.getTime() - Date.now()) / 3_600_000;
    const percentage = hours >= 24 ? 100 : hours >= 12 ? 75 : hours >= 4 ? 50 : 0;
    const payment = booking.payments.find((item) => item.status === "CAPTURED");
    const refundAmount = payment ? Math.round(Number(payment.amount.toString()) * percentage / 100) : 0;
    if (payment && refundAmount) await tx.refund.create({ data: { paymentId: payment.id, bookingId, amount: refundAmount, currency: booking.currency, status: "PENDING", reason: reason || "CUSTOMER_REQUEST" } });
    await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    return { bookingId, status: "CANCELLED", refundAmount, refundStatus: refundAmount ? "PENDING" : "NOT_APPLICABLE" };
  });
}
