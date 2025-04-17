import express from 'express';
import { auth } from '../middleware/auth';
import { getTracks, syncTracks } from '../services/trackServices';

const router = express.Router();

// Get all tracks with pagination and search
router.get('/', async (req: any, res: any) => {
    try {
        const search = req.query.search as string | undefined;
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '10');
        const trackIds = req.query.tracks ?
            Array.isArray(req.query.tracks) ?
                req.query.tracks as string[] :
                [req.query.tracks as string] :
            undefined;

        const result = await getTracks({
            search,
            page,
            limit,
            trackIds
        });

        return res.json(result);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Force rescan of tracks directory
router.post('/sync', auth, async (req: any, res: any) => {
    try {
        const success = await syncTracks();
        if (success) {
            return res.json({ message: 'Tracks synchronized successfully' });
        } else {
            return res.status(500).json({ message: 'Failed to synchronize tracks' });
        }
    } catch (error) {
        console.error('Error syncing tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export default router;