
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        floor: {
            type: String,
            required: true,
        },
        capacity: {
            type: Number,
            required: true,
            min: 1,
        },
        hourlyRate: {
            type: Number,
            required: true,
            min: 0,
        },
        amenities: {
            type: [String],
            default: [],
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        bookingCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
