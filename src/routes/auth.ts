import express from 'express';

import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { models } from '../db/models';
import { auth } from '../middleware/auth';
import { generateToken } from '../services/authServices';

const router = express.Router();

// Register new user
router.post('/register', async (req: any, res: any) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await models.User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const user = await models.User.create({
            id: uuidv4(),
            username,
            email,
            password // Password will be hashed by the beforeCreate hook
        });

        // Generate JWT token
        const token = generateToken(user.id);

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
    } catch (error) {
        // Log the detailed error
        console.error('Registration error:', error);
        // Check if it's a Sequelize validation error
        if (error instanceof Error && error.name === 'SequelizeValidationError') {
             return res.status(400).json({ message: 'Validation failed', errors: (error as any).errors });
        }
        return res.status(500).json({ message: 'Server error during registration' });
    }
});

// --- Login Route ---
router.post('/login', async (req: any, res: any) => {
    try {
        const { username, password } = req.body;

        const user = await models.User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user.id);

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
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login' });
    }
});

// Logout (no model interaction)
router.post('/logout', (req: any, res: any) => {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', auth, async (req: any, res: any) => {
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
    } catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export default router;