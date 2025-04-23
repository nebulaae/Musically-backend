import fs from 'fs';
import path from 'path';
import express from 'express';
import { lookup } from 'mime-types';
import { Track } from '../db/models';
import { auth } from '../middleware/auth';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { getTracks, syncTracks } from '../services/trackServices';

const router = express.Router();

// --- NEW: Streaming Endpoint ---
router.get('/stream/:trackId', async (req: any, res: any) => {
    try {
        const { trackId } = req.params;

        // 1. Find track metadata in DB
        const track = await Track.findByPk(trackId);

        if (!track || !track.src) {
            return res.status(404).json({ message: 'Track not found' });
        }

        // 2. Construct the full path to the audio file
        const filePath = path.join(process.cwd(), 'public', track.src);

        // 3. Check if file exists
        try {
            await fs.promises.stat(filePath);
        } catch (error) {
            console.error(`File not found for track ${trackId}: ${filePath}`, error);
            return res.status(404).json({ message: 'Track file not found' });
        }

        // 4. Get file stats
        const stat = await fs.promises.stat(filePath);
        const fileSize = stat.size;

        // Improved MIME type detection
        const extension = path.extname(filePath).toLowerCase();
        let mimeType: string;

        // Handle common audio formats explicitly
        switch (extension) {
            case '.mp3':
                mimeType = 'audio/mpeg';
                break;
            case '.m4a':
                mimeType = 'audio/mp4';
                break;
            case '.wav':
                mimeType = 'audio/wav';
                break;
            case '.ogg':
                mimeType = 'audio/ogg';
                break;
            case '.flac':
                mimeType = 'audio/flac';
                break;
            case '.aac':
                mimeType = 'audio/aac';
                break;
            case '.webm':
                mimeType = 'audio/webm';
                break;
            default:
                // Fallback to mime-types lookup
                mimeType = lookup(extension.substring(1)) || 'application/octet-stream';
        }

        // 5. Handle range requests (essential for seeking and improving performance)
        const range = req.headers.range;

        if (range) {
            // Parse Range header
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            // Ensure valid ranges
            const chunkSize = Math.min(1024 * 1024 * 2, end - start + 1); // 2MB max chunk
            const finalEnd = Math.min(start + chunkSize - 1, fileSize - 1);

            // Set partial content headers
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${finalEnd}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            });

            // Create and pipe partial stream
            const stream = fs.createReadStream(filePath, { start, end: finalEnd });
            stream.on('error', (err) => {
                console.error(`Stream error for track ${trackId}:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming track' });
                } else {
                    res.end();
                }
            });

            stream.pipe(res);
        } else {
            // Full file response (optimize with chunking)
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': fileSize,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            });

            // Create read stream with reasonable buffer size
            const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 64 }); // 64KB chunks

            stream.on('error', (err) => {
                console.error(`Stream error for track ${trackId}:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming track' });
                } else {
                    res.end();
                }
            });

            stream.pipe(res);
        }
    } catch (error) {
        console.error(`Error streaming track ${req.params.trackId}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error during streaming setup' });
        }
    }
});

// --- MODIFIED: Get all tracks with pagination and search ---
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

        // ---- START TRANSFORMATION ----
        // Modify the 'src' property of each track to point to the streaming endpoint
        const transformedTracks = result.tracks.map(track => ({
            ...track.get({ plain: true }), // Get plain object from Sequelize model instance
            src: `/api/tracks/stream/${track.id}` // Construct the streaming URL
        }));
        // ---- END TRANSFORMATION ----

        return res.json({
            ...result, // Keep total, page, limit, totalPages
            tracks: transformedTracks, // Send the tracks with updated src
        });

    } catch (error) {
        console.error('Error fetching tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Force rescan of tracks directory (no changes needed here)
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

// Endpoint for audio metadata (duration, format, etc.)
router.get('/metadata/:trackId', async (req: any, res: any) => {
    try {
        const { trackId } = req.params;
        const track = await Track.findByPk(trackId);

        if (!track || !track.src) {
            return res.status(404).json({ message: 'Track not found' });
        }

        const filePath = path.join(process.cwd(), 'public', track.src);

        try {
            // Check if file exists
            await fs.promises.stat(filePath);

            // Get audio duration
            const duration = await getAudioDurationInSeconds(filePath);

            // Get file extension and mime type
            const extension = path.extname(filePath).toLowerCase().substring(1);
            const mimeType = lookup(extension) || 'audio/mpeg';

            return res.json({
                id: track.id,
                duration,
                format: extension,
                mimeType
            });
        } catch (error) {
            console.error(`Error getting metadata for track ${trackId}:`, error);
            return res.status(404).json({ message: 'Track file not found or unreadable' });
        }
    } catch (error) {
        console.error(`Error processing metadata for track ${req.params.trackId}:`, error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export default router;