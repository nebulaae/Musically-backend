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
const config_1 = __importDefault(require("../db/config"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const models_1 = require("../db/models");
const router = express_1.default.Router();
// Get liked songs
router.get('/likes', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const likedSongs = yield models_1.Track.findAll({
            include: [
                {
                    model: config_1.default.models.User,
                    as: 'likedByUsers',
                    where: { id: userId },
                    attributes: [],
                    through: { attributes: [] }
                }
            ]
        });
        // GET TOTAL LIKED SONGS
        const totalLikedSongs = likedSongs.length;
        // ---- START TRANSFORMATION ----
        // Modify the 'src' property of each track to point to the streaming endpoint
        const transformedTracks = likedSongs.map(track => (Object.assign(Object.assign({}, track.get({ plain: true })), { src: `/api/tracks/stream/${track.id}` // Construct the streaming URL
         })));
        return res.json({
            tracks: transformedTracks,
            total: totalLikedSongs
        });
    }
    catch (error) {
        console.error('Error fetching liked songs:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}));
// Like a song
router.post('/likes/:trackId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;
        // Check if track exists
        const track = yield models_1.Track.findByPk(trackId);
        if (!track) {
            return res.status(404).json({ message: 'Track not found' });
        }
        // Check if already liked
        const existing = yield models_1.LikedSong.findOne({
            where: { userId, trackId }
        });
        if (!existing) {
            yield models_1.LikedSong.create({ userId, trackId });
            return res.json({ message: 'Track liked successfully', track });
        }
        else {
            return res.json({ message: 'Track already liked', track });
        }
    }
    catch (error) {
        console.error('Error liking track:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}));
// Unlike a song
router.delete('/likes/:trackId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;
        const result = yield models_1.LikedSong.destroy({
            where: { userId, trackId }
        });
        if (result > 0) {
            return res.json({ message: 'Track unliked successfully' });
        }
        else {
            return res.json({ message: 'Track was not liked' });
        }
    }
    catch (error) {
        console.error('Error unliking track:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}));
// Check if a song is liked
router.get('/likes/:trackId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { trackId } = req.params;
        const likedSong = yield models_1.LikedSong.findOne({
            where: { userId, trackId }
        });
        return res.json({ isLiked: !!likedSong });
    }
    catch (error) {
        console.error('Error checking liked status:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}));
exports.default = router;
//# sourceMappingURL=users.js.map