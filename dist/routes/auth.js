"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../config/logger");
const User_1 = __importDefault(require("../models/User"));
const logger = new logger_1.Logger("AuthRoutes");
const router = (0, express_1.Router)();
// Simple password hashing function (for demo - use bcrypt in production)
const hashPassword = (password) => {
    return crypto_1.default.createHash("sha256").update(password).digest("hex");
};
const verifyPassword = (password, hash) => {
    return hashPassword(password) === hash;
};
// Signup endpoint
router.post("/signup", async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // Validate inputs
        if (!email || !username || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ error: "Password must be at least 6 characters" });
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({
            $or: [{ email: email.toLowerCase() }, { username }],
        });
        if (existingUser) {
            return res.status(409).json({
                error: existingUser.email === email.toLowerCase()
                    ? "Email already registered"
                    : "Username already taken",
            });
        }
        // Generate party ID
        const HASH = "1220572515ea25db89f8aec321e1989d4cc6ec26b1dc71b6abc320a6aca688af744f";
        const partyId = `${username}::${HASH}`;
        // Hash password
        const hashedPassword = hashPassword(password);
        // Create new user
        const newUser = new User_1.default({
            email: email.toLowerCase(),
            username,
            password: hashedPassword,
            partyId,
        });
        await newUser.save();
        logger.info(`New user registered: ${email} (${username})`);
        // Return user data (without password)
        res.status(201).json({
            success: true,
            user: {
                email: newUser.email,
                username: newUser.username,
                partyId: newUser.partyId,
            },
        });
    }
    catch (error) {
        logger.error("Signup error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
// Login endpoint
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        // Find user by email
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        // Verify password
        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        logger.info(`User logged in: ${email}`);
        // Return user data (without password)
        res.json({
            success: true,
            user: {
                email: user.email,
                username: user.username,
                partyId: user.partyId,
            },
        });
    }
    catch (error) {
        logger.error("Login error:", error);
        res.status(500).json({ error: "Failed to login" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map