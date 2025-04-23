"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.getTracks = exports.syncTracks = void 0;
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const NodeID3 = __importStar(require("node-id3"));
const sequelize_1 = require("sequelize");
const models_1 = require("../db/models");
// Generate a consistent ID based on file properties
function generateConsistentId(filename, fileSize) {
    const hash = crypto_1.default.createHash('md5');
    hash.update(`${filename}-${fileSize}`);
    return hash.digest('hex');
}
// Efficient file hash function
function fileHash(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stats = yield promises_1.default.stat(filePath);
            const hashInput = `${filePath}-${stats.size}-${stats.mtime.getTime()}`;
            return crypto_1.default.createHash('md5').update(hashInput).digest('hex');
        }
        catch (error) {
            console.error(`Error creating file hash for ${filePath}:`, error);
            return crypto_1.default.randomBytes(16).toString('hex'); // Fallback
        }
    });
}
// Cover caching logic
const MAX_COVER_CACHE_SIZE = 500;
const coverCache = {};
const coverCacheTimestamps = {};
function getCoverFromCache(hash, coverFilename, imageBuffer) {
    return __awaiter(this, void 0, void 0, function* () {
        // For production, we'll use data URLs. For development, store in filesystem
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            const base64Image = imageBuffer.toString('base64');
            return `data:image/jpeg;base64,${base64Image}`;
        }
        if (!coverCache[hash]) {
            const coverPath = path_1.default.join(process.cwd(), 'public', 'covers');
            yield promises_1.default.mkdir(coverPath, { recursive: true });
            // Check if imageBuffer is valid before writing to file
            if (imageBuffer && imageBuffer.length > 0) {
                yield promises_1.default.writeFile(path_1.default.join(coverPath, coverFilename), imageBuffer);
            }
            else {
                console.error(`Invalid image buffer for hash ${hash}, using default cover.`);
                return '/default-cover.jpg'; // Return default cover if buffer is invalid
            }
            coverCache[hash] = `/covers/${coverFilename}`;
            coverCacheTimestamps[hash] = Date.now();
            // Clean up cache if it exceeds max size
            if (Object.keys(coverCache).length > MAX_COVER_CACHE_SIZE) {
                const oldestKey = Object.keys(coverCacheTimestamps).sort((a, b) => coverCacheTimestamps[a] - coverCacheTimestamps[b])[0];
                if (oldestKey) {
                    delete coverCache[oldestKey];
                    delete coverCacheTimestamps[oldestKey];
                }
            }
        }
        else {
            // Update timestamp for LRU
            coverCacheTimestamps[hash] = Date.now();
        }
        return coverCache[hash];
    });
}
// Get all tracks from the filesystem and update the database
function syncTracks() {
    return __awaiter(this, void 0, void 0, function* () {
        const tracksDirectory = path_1.default.join(process.cwd(), 'public', 'tracks');
        try {
            // Ensure the tracks directory exists
            yield promises_1.default.mkdir(tracksDirectory, { recursive: true });
            const filenames = yield promises_1.default.readdir(tracksDirectory);
            const validExtensions = new Set(['.mp3', '.wav', '.flac', '.m4a']);
            for (const filename of filenames) {
                if (!validExtensions.has(path_1.default.extname(filename).toLowerCase())) {
                    continue;
                }
                const filePath = path_1.default.join(tracksDirectory, filename);
                const stats = yield promises_1.default.stat(filePath);
                // Generate consistent ID
                const fileId = generateConsistentId(filename, stats.size);
                // Check if track already exists in the database
                const existingTrack = yield models_1.Track.findByPk(fileId);
                if (existingTrack) {
                    continue; // Skip if already in the database
                }
                // Extract basic info
                const fileType = path_1.default.extname(filename).toLowerCase().substring(1);
                let title = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ');
                let author = 'Unknown Artist';
                let album = 'Unknown Album';
                let cover = '/default-cover.jpg';
                // Extract ID3 tags if MP3
                if (path_1.default.extname(filename).toLowerCase() === '.mp3') {
                    try {
                        const tags = NodeID3.read(filePath);
                        if (tags) {
                            title = tags.title || title;
                            author = tags.artist || tags.composer || author;
                            album = tags.album || album;
                            // Handle cover image from ID3 tags
                            if (tags.image &&
                                typeof tags.image !== 'string' &&
                                tags.image.imageBuffer) {
                                try {
                                    const hash = yield fileHash(filePath);
                                    const coverFilename = `${hash}-cover.jpg`;
                                    try {
                                        cover = yield getCoverFromCache(hash, coverFilename, tags.image.imageBuffer);
                                    }
                                    catch (err) {
                                        console.error(`Error saving cover image for ${filename}:`, err);
                                    }
                                }
                                catch (err) {
                                    console.error(`Error processing cover image for ${filename}:`, err);
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error(`Error reading ID3 tags from ${filename}:`, error);
                    }
                }
                // Save track to database - using create instead of directly using the constructor
                yield models_1.Track.create({
                    id: fileId,
                    title,
                    author,
                    album,
                    src: `/tracks/${filename}`,
                    cover,
                    type: fileType,
                });
            }
            console.log('Track synchronization completed');
            return true;
        }
        catch (error) {
            console.error('Error syncing tracks:', error);
            return false;
        }
    });
}
exports.syncTracks = syncTracks;
// Get all tracks with optional filtering and pagination
function getTracks(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { search, page = 1, limit = 10, trackIds } = options;
        const offset = (page - 1) * limit;
        try {
            const whereClause = {};
            if (trackIds && trackIds.length > 0) {
                whereClause.id = trackIds;
            }
            if (search) {
                whereClause[sequelize_1.Op.or] = [
                    { title: { [sequelize_1.Op.like]: `%${search}%` } },
                    { author: { [sequelize_1.Op.like]: `%${search}%` } },
                    { album: { [sequelize_1.Op.like]: `%${search}%` } }
                ];
            }
            const { count, rows } = yield models_1.Track.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [['title', 'ASC']]
            });
            return {
                tracks: rows,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            };
        }
        catch (error) {
            console.error('Error fetching tracks:', error);
            throw error;
        }
    });
}
exports.getTracks = getTracks;
exports.default = { syncTracks, getTracks };
//# sourceMappingURL=trackServices.js.map