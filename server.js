
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: local and production frontend
const allowedOrigins = [
    "http://localhost:5173",
    "https://assignment-9-vert.vercel.app",
];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// API health check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "StudyNook API is running",
    });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);

// Start server after MongoDB connects
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`StudyNook server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();





// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import dotenv from "dotenv";
// import connectDB from "./config/db.js";
// import authRoutes from "./routes/authRoutes.js";
// import roomRoutes from "./routes/roomRoutes.js";
// import bookingRoutes from "./routes/bookingRoutes.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// // app.use(
// //     cors({
// //         origin: process.env.CLIENT_URL || "http://localhost:5173",
// //         credentials: true,
// //     })
// // );

// /* Middleware */
// const allowedOrigins = [
//     "http://localhost:5173",
//     "https://assignment-9-vert.vercel.app",
// ];

// app.use(
//     cors({
//         origin: allowedOrigins,
//         credentials: true,
//     })
// );


// app.use(express.json());
// app.use(cookieParser());

// // API health check
// app.get("/", (req, res) => {
//     res.status(200).json({
//         success: true,
//         message: "StudyNook API is running",
//     });
// });

// // Authentication API
// app.use("/api/auth", authRoutes);

// // Study room API
// app.use("/api/rooms", roomRoutes);
// app.use("/api/bookings", bookingRoutes);

// // Start server after MongoDB connects
// const startServer = async () => {
//     try {
//         await connectDB();

//         app.listen(PORT, () => {
//             console.log(`StudyNook server running on port ${PORT}`);
//         });
//     } catch (error) {
//         console.error("Server startup failed:", error.message);
//         process.exit(1);
//     }
// };

// startServer();
