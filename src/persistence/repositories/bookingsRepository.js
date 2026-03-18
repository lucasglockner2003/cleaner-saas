import { createBookingRequest, updateBookingRequestStatus } from "../../services/bookings/bookingsService";
import { withPersistPlan } from "./repositoryResult";

export function createBookingsRepository() {
  return {
    createRequest(db, payload, options = {}) {
      return withPersistPlan(createBookingRequest(db, payload, options), ["bookingRequests"]);
    },

    setStatus(db, bookingId, status, reviewerId, internalNotes = "") {
      return withPersistPlan(updateBookingRequestStatus(db, bookingId, status, reviewerId, internalNotes), ["bookingRequests"]);
    }
  };
}
