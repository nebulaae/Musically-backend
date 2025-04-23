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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const mime_types_1 = require("mime-types");
const models_1 = require("../db/models");
const auth_1 = require("../middleware/auth");
const get_audio_duration_1 = require("get-audio-duration");
const trackServices_1 = require("../services/trackServices");
const router = express_1.default.Router();
// --- NEW: Streaming Endpoint ---
router.get('/stream/:trackId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trackId } = req.params;
        // 1. Find track metadata in DB
        const track = yield models_1.Track.findByPk(trackId);
        if (!track || !track.src) {
            return res.status(404).json({ message: 'Track not found' });
        }
        // 2. Construct the full path to the audio file
        const filePath = path_1.default.join(process.cwd(), 'public', track.src);
        // 3. Check if file exists
        try {
            yield fs_1.default.promises.stat(filePath);
        }
        catch (error) {
            console.error(`File not found for track ${trackId}: ${filePath}`, error);
            return res.status(404).json({ message: 'Track file not found' });
        }
        // 4. Get file stats
        const stat = yield fs_1.default.promises.stat(filePath);
        const fileSize = stat.size;
        // Improved MIME type detection
        const extension = path_1.default.extname(filePath).toLowerCase();
        let mimeType;
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
                mimeType = (0, mime_types_1.lookup)(extension.substring(1)) || 'application/octet-stream';
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
            const stream = fs_1.default.createReadStream(filePath, { start, end: finalEnd });
            stream.on('error', (err) => {
                console.error(`Stream error for track ${trackId}:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming track' });
                }
                else {
                    res.end();
                }
            });
            stream.pipe(res);
        }
        else {
            // Full file response (optimize with chunking)
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': fileSize,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            });
            // Create read stream with reasonable buffer size
            const stream = fs_1.default.createReadStream(filePath, { highWaterMark: 1024 * 64 }); // 64KB chunks
            stream.on('error', (err) => {
                console.error(`Stream error for track ${trackId}:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming track' });
                }
                else {
                    res.end();
                }
            });
            stream.pipe(res);
        }
    }
    catch (error) {
        console.error(`Error streaming track ${req.params.trackId}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error during streaming setup' });
        }
    }
}));
// --- MODIFIED: Get all tracks with pagination and search ---
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const trackIds = req.query.tracks ?
            Array.isArray(req.query.tracks) ?
                req.query.tracks :
                [req.query.tracks] :
            undefined;
        const result = yield (0, trackServices_1.getTracks)({
            search,
            page,
            limit,
            trackIds
        });
        // ---- START TRANSFORMATION ----
        // Modify the 'src' property of each track to point to the streaming endpoint
        const transformedTracks = result.tracks.map(track => (Object.assign(Object.assign({}, track.get({ plain: true })), { src: `/api/tracks/stream/${track.id}` // Construct the streaming URL
         })));
        // ---- END TRANSFORMATION ----
        return res.json(Object.assign(Object.assign({}, result), { tracks: transformedTracks }));
    }
    catch (error) {
        console.error('Error fetching tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
// Force rescan of tracks directory (no changes needed here)
router.post('/sync', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const success = yield (0, trackServices_1.syncTracks)();
        if (success) {
            return res.json({ message: 'Tracks synchronized successfully' });
        }
        else {
            return res.status(500).json({ message: 'Failed to synchronize tracks' });
        }
    }
    catch (error) {
        console.error('Error syncing tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
// Endpoint for audio metadata (duration, format, etc.)
router.get('/metadata/:trackId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trackId } = req.params;
        const track = yield models_1.Track.findByPk(trackId);
        if (!track || !track.src) {
            return res.status(404).json({ message: 'Track not found' });
        }
        const filePath = path_1.default.join(process.cwd(), 'public', track.src);
        try {
            // Check if file exists
            yield fs_1.default.promises.stat(filePath);
            // Get audio duration
            const duration = yield (0, get_audio_duration_1.getAudioDurationInSeconds)(filePath);
            // Get file extension and mime type
            const extension = path_1.default.extname(filePath).toLowerCase().substring(1);
            const mimeType = (0, mime_types_1.lookup)(extension) || 'audio/mpeg';
            return res.json({
                id: track.id,
                duration,
                format: extension,
                mimeType
            });
        }
        catch (error) {
            console.error(`Error getting metadata for track ${trackId}:`, error);
            return res.status(404).json({ message: 'Track file not found or unreadable' });
        }
    }
    catch (error) {
        console.error(`Error processing metadata for track ${req.params.trackId}:`, error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=tracks.js.map