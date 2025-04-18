"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1336984336.
const express_1 = __importDefault(require("express"));
const sequelize_1 = require("sequelize");
const uuid_1 = require("uuid");
const models_1 = require("../db/models");
const auth_1 = require("../middleware/auth");
const authServices_1 = require("../services/authServices");
const router = express_1.default.Router();
// Register new user
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        const existingUser = yield models_1.models.User.findOne({
            where: {
                [sequelize_1.Op.or]: [{ username }, { email }]
            }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        const user = yield models_1.models.User.create({
            id: (0, uuid_1.v4)(),
            username,
            email,
            password // Password will be hashed by the beforeCreate hook
        });
        // Generate JWT token
        const token = (0, authServices_1.generateToken)(user.id);
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days
        });
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        // Log the detailed error
        console.error('Registration error:', error);
        // Check if it's a Sequelize validation error
        if (error instanceof Error && error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        return res.status(500).json({ message: 'Server error during registration' });
    }
}));
// --- Login Route ---
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { usernameOrEmail, password } = req.body;
        const user = yield models_1.models.User.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { username: usernameOrEmail },
                    { email: usernameOrEmail },
                ],
            },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = (0, authServices_1.generateToken)(user.id);
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days
        });
        // Return token in response body as well
        return res.json({
            token, // Include token in response
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login' });
    }
}));
// Logout (no model interaction)
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
});
// Get current user
router.get('/me', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // req.user is already the fetched user instance from the auth middleware
        const user = req.user;
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=auth.js.map