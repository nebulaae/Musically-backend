import cors from 'cors';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';

import db from './db/config';

import { setupInitialUser } from './services/authServices';
import { syncTracks } from './services/trackServices';

// Import routes
import authRoutes from './routes/auth';
import tracksRoutes from './routes/tracks';
import playlistRoutes from './routes/playlists';
import userRoutes from './routes/users';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://3000-idx-musically-1743873794879.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
``
// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database models
    await db.sync();
    console.log('Database synchronized');

    // Setup initial user if none exists
    await setupInitialUser();

    // Sync tracks on startup
    await syncTracks();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();