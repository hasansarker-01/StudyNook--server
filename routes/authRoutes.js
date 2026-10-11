
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Create the HTTP-only authentication cookie.
const setAuthCookie = (res, userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing from the environment.");
    }

    const token = jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    });
};

// REGISTER
// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, photoURL, password } = req.body ?? {};

        // Required fields
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof photoURL !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !photoURL.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, photo URL, and password are required.",
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhotoURL = photoURL.trim();

        // Validate name
        if (normalizedName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name cannot exceed 100 characters.",
            });
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            normalizedEmail.length > 254 ||
            !emailPattern.test(normalizedEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        // Validate password requirements
        if (
            password.length < 6 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must have at least 6 characters, one uppercase letter, and one lowercase letter.",
            });
        }

        // Validate photo URL
        let parsedPhotoURL;

        try {
            parsedPhotoURL = new URL(normalizedPhotoURL);
        } catch {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid photo URL.",
            });
        }

        if (!["http:", "https:"].includes(parsedPhotoURL.protocol)) {
            return res.status(400).json({
                success: false,
                message: "Photo URL must start with http:// or https://.",
            });
        }

        // Check for an existing account
        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please log in.",
            });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the user; do not automatically log them in
        await User.create({
            name: normalizedName,
            email: normalizedEmail,
            photoURL: parsedPhotoURL.href,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful! Please login.",
        });
    } catch (error) {
        // Handles a duplicate-key race condition
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please log in.",
            });
        }

        console.error("Registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again.",
        });
    }
});

// LOGIN
// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        setAuthCookie(res, user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoURL: user.photoURL,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again.",
        });
    }
});

// CURRENT USER
// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "name email photoURL"
        );

        if (!user) {
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
            });

            return res.status(401).json({
                success: false,
                message: "User account not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoURL: user.photoURL,
            },
        });
    } catch (error) {
        console.error("Get current user error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not load your account.",
        });
    }
});

// LOGOUT
// POST /api/auth/logout
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
});

export default router;
