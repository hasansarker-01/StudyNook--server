
import express from "express";
import mongoose from "mongoose";
import Room from "../models/Room.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Allowed fields for creating or updating a room
const allowedFields = [
    "name",
    "description",
    "image",
    "floor",
    "capacity",
    "hourlyRate",
    "amenities",
];

// GET /api/rooms - Get all study rooms (public)
router.get("/", async (req, res) => {
    try {
        const rooms = await Room.find()
            .select("-__v")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: rooms.length,
            rooms,
        });
    } catch (error) {
        console.error("Get rooms error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch study rooms",
        });
    }
});

// GET /api/rooms/:id - Get one study room (public)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        const room = await Room.findById(id).select("-__v");

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Study room not found",
            });
        }

        return res.status(200).json({
            success: true,
            room,
        });
    } catch (error) {
        console.error("Get room error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch study room",
        });
    }
});

// POST /api/rooms - Create a study room (login required)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            name,
            description,
            image,
            floor,
            capacity,
            hourlyRate,
            amenities,
        } = req.body;

        if (
            !name?.trim() ||
            !description?.trim() ||
            !image?.trim() ||
            !floor?.trim() ||
            capacity === undefined ||
            hourlyRate === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required room fields",
            });
        }

        const parsedCapacity = Number(capacity);
        const parsedHourlyRate = Number(hourlyRate);

        if (
            !Number.isInteger(parsedCapacity) ||
            parsedCapacity < 1 ||
            !Number.isFinite(parsedHourlyRate) ||
            parsedHourlyRate < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be a positive integer and hourly rate cannot be negative",
            });
        }

        if (
            amenities !== undefined &&
            (!Array.isArray(amenities) ||
                !amenities.every((item) => typeof item === "string"))
        ) {
            return res.status(400).json({
                success: false,
                message: "Amenities must be an array of strings",
            });
        }

        const room = await Room.create({
            name: name.trim(),
            description: description.trim(),
            image: image.trim(),
            floor: floor.trim(),
            capacity: parsedCapacity,
            hourlyRate: parsedHourlyRate,
            amenities: amenities || [],
            owner: req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Study room created successfully",
            room,
        });
    } catch (error) {
        console.error("Create room error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create study room",
        });
    }
});

// PUT /api/rooms/:id - Update your own room (login required)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        const room = await Room.findById(id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Study room not found",
            });
        }

        if (room.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own study rooms",
            });
        }

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (updates.capacity !== undefined) {
            updates.capacity = Number(updates.capacity);

            if (!Number.isInteger(updates.capacity) || updates.capacity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Capacity must be a positive integer",
                });
            }
        }

        if (updates.hourlyRate !== undefined) {
            updates.hourlyRate = Number(updates.hourlyRate);

            if (
                !Number.isFinite(updates.hourlyRate) ||
                updates.hourlyRate < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Hourly rate cannot be negative",
                });
            }
        }

        if (
            updates.amenities !== undefined &&
            (!Array.isArray(updates.amenities) ||
                !updates.amenities.every((item) => typeof item === "string"))
        ) {
            return res.status(400).json({
                success: false,
                message: "Amenities must be an array of strings",
            });
        }

        const updatedRoom = await Room.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).select("-__v");

        return res.status(200).json({
            success: true,
            message: "Study room updated successfully",
            room: updatedRoom,
        });
    } catch (error) {
        console.error("Update room error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update study room",
        });
    }
});

// DELETE /api/rooms/:id - Delete your own room (login required)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        const room = await Room.findById(id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Study room not found",
            });
        }

        if (room.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own study rooms",
            });
        }

        await Room.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Study room deleted successfully",
        });
    } catch (error) {
        console.error("Delete room error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to delete study room",
        });
    }
});

export default router;
