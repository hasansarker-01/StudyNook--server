
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Validate HH:MM time format
const isValidTime = (time) =>
    typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

// Validate date in YYYY-MM-DD format
const isValidDate = (date) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
    );
};

// GET /api/bookings/my - Get current user's bookings
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .populate("roomId", "name image floor hourlyRate capacity")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings,
        });
    } catch (error) {
        console.error("Get bookings error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
        });
    }
});

// POST /api/bookings - Create a booking
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { roomId, date, startTime, endTime, specialNote = "" } = req.body;

        if (!roomId || !date || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Room, date, start time and end time are required",
            });
        }

        if (!mongoose.isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        if (!isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime)) {
            return res.status(400).json({
                success: false,
                message: "Use a valid date (YYYY-MM-DD) and time (HH:MM)",
            });
        }

        // A booking must have a positive duration
        if (startTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: "End time must be later than start time",
            });
        }

        if (typeof specialNote !== "string" || specialNote.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Special note must be a string of at most 500 characters",
            });
        }

        // Prevent bookings for dates in the past (UTC date)
        const today = new Date().toISOString().slice(0, 10);

        if (date < today) {
            return res.status(400).json({
                success: false,
                message: "You cannot book a date in the past",
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Study room not found",
            });
        }

        // Find overlapping confirmed bookings for the same room and date
        const conflict = await Booking.findOne({
            roomId,
            date,
            status: "confirmed",
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: "This room is already booked for the selected time",
            });
        }

        // Calculate the cost from the room's stored hourly rate
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);

        const durationHours =
            (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;

        const totalCost = Number((durationHours * room.hourlyRate).toFixed(2));

        const booking = await Booking.create({
            userId: req.user.id,
            roomId,
            date,
            startTime,
            endTime,
            totalCost,
            specialNote: specialNote.trim(),
            status: "confirmed",
        });

        // Keep the user's booking references synchronized
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { bookings: booking._id },
        });

        return res.status(201).json({
            success: true,
            message: "Study room booked successfully",
            booking,
        });
    } catch (error) {
        console.error("Create booking error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create booking",
        });
    }
});

// PATCH /api/bookings/:id/cancel - Cancel your own booking
router.patch("/:id/cancel", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        const booking = await Booking.findOne({
            _id: id,
            userId: req.user.id,
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled",
            });
        }

        booking.status = "cancelled";
        await booking.save();

        await User.findByIdAndUpdate(req.user.id, {
            $pull: { bookings: booking._id },
        });

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking,
        });
    } catch (error) {
        console.error("Cancel booking error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
        });
    }
});

export default router;
