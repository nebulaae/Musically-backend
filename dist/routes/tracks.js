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
const auth_1 = require("../middleware/auth");
const trackServices_1 = require("../services/trackServices");
const router = express_1.default.Router();
// Get all tracks with pagination and search
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
        return res.json(result);
    }
    catch (error) {
        console.error('Error fetching tracks:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
// Force rescan of tracks directory
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
exports.default = router;
//# sourceMappingURL=tracks.js.map