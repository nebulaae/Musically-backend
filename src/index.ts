// Suggested code may be subject to a license. Learn more: ~LicenseLog:2493378367.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:505570613.
import cors from 'cors';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';

import db from './db/config';

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
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

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

// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database models
    await db.sync();
    console.log('Database synchronized');

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