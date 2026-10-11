
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        totalCost: {
            type: Number,
            required: true,
            min: 0,
        },
        specialNote: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed",
        },
    },
    { timestamps: true }
);

// Efficiently find bookings for a room and date.
bookingSchema.index({
    roomId: 1,
    date: 1,
    status: 1,
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
