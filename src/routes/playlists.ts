// /routes/playlist.ts
import express from 'express';
import { auth } from '../middleware/auth';
import { models } from '../db/models';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all playlists for current user
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const playlists = await models.Playlist.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.json({ playlists });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new playlist
router.post('/', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Playlist name is required' });
        }

        const playlist = await models.Playlist.create({
            id: uuidv4(),
            name,
            userId
        });

        res.status(201).json({ playlist });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a playlist with its tracks
router.get('/:id', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const playlist = await models.Playlist.findOne({
            where: { id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        const tracks = await models.Track.findAll({
            include: [
                {
                    model: models.Playlist,
                    as: 'playlists',
                    where: { id },
                    attributes: [],
                    through: { attributes: [] }
                }
            ]
        });

        res.json({ playlist, tracks });
    } catch (error) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add track to playlist
router.post('/:id/tracks/:trackId', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id, trackId } = req.params;

        // Verify playlist ownership
        const playlist = await models.Playlist.findOne({
            where: { id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Check if track exists
        const track = await models.Track.findByPk(trackId);
        if (!track) {
            return res.status(404).json({ message: 'Track not found' });
        }

        // Check if track is already in playlist
        const existing = await models.PlaylistTrack.findOne({
            where: { playlistId: id, trackId }
        });

        if (!existing) {
            await models.PlaylistTrack.create({ playlistId: id, trackId });
        }

        res.json({ message: 'Track added to playlist successfully' });
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove track from playlist
router.delete('/:id/tracks/:trackId', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id, trackId } = req.params;

        // Verify playlist ownership
        const playlist = await models.Playlist.findOne({
            where: { id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Remove the track from the playlist
        await models.PlaylistTrack.destroy({
            where: { playlistId: id, trackId }
        });

        res.json({ message: 'Track removed from playlist successfully' });
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a playlist
router.delete('/:id', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verify playlist ownership
        const playlist = await models.Playlist.findOne({
            where: { id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Delete all playlist-track associations first
        await models.PlaylistTrack.destroy({
            where: { playlistId: id }
        });

        // Delete the playlist
        await models.Playlist.destroy({
            where: { id }
        });

        res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Rename a playlist
router.put('/:id', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Playlist name is required' });
        }

        // Verify playlist ownership
        const playlist = await models.Playlist.findOne({
            where: { id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Update the playlist name
        await models.Playlist.update({ name }, {
            where: { id }
        });

        res.json({ message: 'Playlist renamed successfully' });
    } catch (error) {
        console.error('Error renaming playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;