import db from '../db/config';
import express from 'express';
import { auth } from '../middleware/auth';
import { Track, LikedSong } from '../db/models';

const router = express.Router();

// Get liked songs
router.get('/likes', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const likedSongs = await Track.findAll({
            include: [
                {
                    model: db.models.User,
                    as: 'likedByUsers',
                    where: { id: userId },
                    attributes: [],
                    through: { attributes: [] }
                }
            ]
        });

        return res.json({ tracks: likedSongs });
    } catch (error) {
        console.error('Error fetching liked songs:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Like a song
router.post('/likes/:trackId', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;

        // Check if track exists
        const track = await Track.findByPk(trackId);
        if (!track) {
            return res.status(404).json({ message: 'Track not found' });
        }

        // Check if already liked
        const existing = await LikedSong.findOne({
            where: { userId, trackId }
        });

        if (!existing) {
            await LikedSong.create({ userId, trackId });
            return res.json({ message: 'Track liked successfully', track });
        } else {
            return res.json({ message: 'Track already liked', track });
        }
    } catch (error) {
        console.error('Error liking track:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Unlike a song
router.delete('/likes/:trackId', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;

        const result = await LikedSong.destroy({
            where: { userId, trackId }
        });

        if (result > 0) {
            return res.json({ message: 'Track unliked successfully' });
        } else {
            return res.json({ message: 'Track was not liked' });
        }
    } catch (error) {
        console.error('Error unliking track:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Check if a song is liked
router.get('/likes/:trackId', auth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;

        const likedSong = await LikedSong.findOne({
            where: { userId, trackId }
        });

        return res.json({ isLiked: !!likedSong });
    } catch (error) {
        console.error('Error checking liked status:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;