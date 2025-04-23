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
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const models_1 = require("../db/models");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all playlists
router.get('/', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const playlists = yield models_1.models.Playlist.findAll({
            where: { userId },
            include: [
                {
                    model: models_1.models.Track,
                    as: 'tracks',
                    through: { attributes: [] }
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        // Type assertion for the plain objects
        const transformedPlaylists = playlists.map(playlist => {
            var _a;
            const plainPlaylist = playlist.get({ plain: true });
            return Object.assign(Object.assign({}, plainPlaylist), { tracks: (_a = plainPlaylist.tracks) === null || _a === void 0 ? void 0 : _a.map(track => (Object.assign(Object.assign({}, track), { src: `/api/tracks/stream/${track.id}` }))) });
        });
        res.json({ playlists: transformedPlaylists });
    }
    catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Create new playlist
router.post('/', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Playlist name is required' });
        }
        const playlist = yield models_1.models.Playlist.create({
            id: (0, uuid_1.v4)(),
            name,
            userId
        });
        res.status(201).json({ playlist });
    }
    catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Get a playlist with its tracks
router.get('/:id', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const playlist = yield models_1.models.Playlist.findOne({
            where: { id, userId },
            include: [
                {
                    model: models_1.models.Track,
                    as: 'tracks',
                    through: { attributes: [] }
                }
            ]
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        // Type assertion for the plain object
        const plainPlaylist = playlist.get({ plain: true });
        const transformedPlaylist = Object.assign(Object.assign({}, plainPlaylist), { tracks: (_a = plainPlaylist.tracks) === null || _a === void 0 ? void 0 : _a.map(track => (Object.assign(Object.assign({}, track), { src: `/api/tracks/stream/${track.id}` }))) });
        return res.json({ playlist: transformedPlaylist });
    }
    catch (error) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Add track to playlist
router.post('/:id/tracks/:trackId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id, trackId } = req.params;
        // Verify playlist ownership
        const playlist = yield models_1.models.Playlist.findOne({
            where: { id, userId }
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        // Check if track exists
        const track = yield models_1.models.Track.findByPk(trackId);
        if (!track) {
            return res.status(404).json({ message: 'Track not found' });
        }
        // Check if track is already in playlist
        const existing = yield models_1.models.PlaylistTrack.findOne({
            where: { playlistId: id, trackId }
        });
        if (!existing) {
            yield models_1.models.PlaylistTrack.create({ playlistId: id, trackId });
        }
        res.json({ message: 'Track added to playlist successfully' });
    }
    catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Remove track from playlist
router.delete('/:id/tracks/:trackId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id, trackId } = req.params;
        // Verify playlist ownership
        const playlist = yield models_1.models.Playlist.findOne({
            where: { id, userId }
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        // Remove the track from the playlist
        yield models_1.models.PlaylistTrack.destroy({
            where: { playlistId: id, trackId }
        });
        res.json({ message: 'Track removed from playlist successfully' });
    }
    catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Delete a playlist
router.delete('/:id', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Verify playlist ownership
        const playlist = yield models_1.models.Playlist.findOne({
            where: { id, userId }
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        // Delete all playlist-track associations first
        yield models_1.models.PlaylistTrack.destroy({
            where: { playlistId: id }
        });
        // Delete the playlist
        yield models_1.models.Playlist.destroy({
            where: { id }
        });
        res.json({ message: 'Playlist deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Rename a playlist
router.put('/:id', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Playlist name is required' });
        }
        // Verify playlist ownership
        const playlist = yield models_1.models.Playlist.findOne({
            where: { id, userId }
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        // Update the playlist name
        yield models_1.models.Playlist.update({ name }, {
            where: { id }
        });
        res.json({ message: 'Playlist renamed successfully' });
    }
    catch (error) {
        console.error('Error renaming playlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=playlists.js.map