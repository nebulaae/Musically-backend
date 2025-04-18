import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import * as NodeID3 from 'node-id3';
import { Op } from 'sequelize';
import { Track } from '../db/models';

// Generate a consistent ID based on file properties
function generateConsistentId(filename: string, fileSize: number): string {
    const hash = crypto.createHash('md5');
    hash.update(`${filename}-${fileSize}`);
    return hash.digest('hex');
}

// Efficient file hash function
async function fileHash(filePath: string): Promise<string> {
    try {
        const stats = await fs.stat(filePath);
        const hashInput = `${filePath}-${stats.size}-${stats.mtime.getTime()}`;
        return crypto.createHash('md5').update(hashInput).digest('hex');
    } catch (error) {
        console.error(`Error creating file hash for ${filePath}:`, error);
        return crypto.randomBytes(16).toString('hex'); // Fallback
    }
}

// Cover caching logic
const MAX_COVER_CACHE_SIZE = 500;
const coverCache: { [key: string]: string } = {};
const coverCacheTimestamps: { [key: string]: number } = {};

async function getCoverFromCache(hash: string, coverFilename: string, imageBuffer: Buffer): Promise<string> {
    // For production, we'll use data URLs. For development, store in filesystem
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        const base64Image = imageBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64Image}`;
    }

    if (!coverCache[hash]) {
        const coverPath = path.join(process.cwd(), 'public', 'covers');
        await fs.mkdir(coverPath, { recursive: true });

        // Check if imageBuffer is valid before writing to file
        if (imageBuffer && imageBuffer.length > 0) {
            await fs.writeFile(path.join(coverPath, coverFilename), imageBuffer);
        } else {
            console.error(`Invalid image buffer for hash ${hash}, using default cover.`);
            return '/default-cover.jpg'; // Return default cover if buffer is invalid
        }

        coverCache[hash] = `/covers/${coverFilename}`;
        coverCacheTimestamps[hash] = Date.now();

        // Clean up cache if it exceeds max size
        if (Object.keys(coverCache).length > MAX_COVER_CACHE_SIZE) {
            const oldestKey = Object.keys(coverCacheTimestamps).sort(
                (a, b) => coverCacheTimestamps[a] - coverCacheTimestamps[b]
            )[0];

            if (oldestKey) {
                delete coverCache[oldestKey];
                delete coverCacheTimestamps[oldestKey];
            }
        }
    } else {
        // Update timestamp for LRU
        coverCacheTimestamps[hash] = Date.now();
    }

    return coverCache[hash];
}

// Get all tracks from the filesystem and update the database
export async function syncTracks(): Promise<boolean> {
    const tracksDirectory = path.join(process.cwd(), 'public', 'tracks');

    try {
        // Ensure the tracks directory exists
        await fs.mkdir(tracksDirectory, { recursive: true });

        const filenames = await fs.readdir(tracksDirectory);
        const validExtensions = new Set(['.mp3', '.wav', '.flac', '.m4a']);

        for (const filename of filenames) {
            if (!validExtensions.has(path.extname(filename).toLowerCase())) {
                continue;
            }

            const filePath = path.join(tracksDirectory, filename);
            const stats = await fs.stat(filePath);

            // Generate consistent ID
            const fileId = generateConsistentId(filename, stats.size);

            // Check if track already exists in the database
            const existingTrack = await Track.findByPk(fileId);
            if (existingTrack) {
                continue; // Skip if already in the database
            }

            // Extract basic info
            const fileType = path.extname(filename).toLowerCase().substring(1);
            let title = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ');
            let author: string = 'Unknown Artist';
            let album: string = 'Unknown Album';
            let cover: string = '/default-cover.jpg';

            // Extract ID3 tags if MP3
            if (path.extname(filename).toLowerCase() === '.mp3') {
                try {
                    const tags = NodeID3.read(filePath);
                    if (tags) {
                        title = tags.title || title;
                        author = tags.artist || tags.composer || author;
                        album = tags.album || album;

                        // Handle cover image from ID3 tags
                        if (
                            tags.image &&
                            typeof tags.image !== 'string' &&
                            tags.image.imageBuffer
                        ) {
                            try {
                                const hash = await fileHash(filePath);
                                const coverFilename = `${hash}-cover.jpg`;

                                try {
                                    cover = await getCoverFromCache(hash, coverFilename, tags.image.imageBuffer);
                                } catch (err) {
                                    console.error(`Error saving cover image for ${filename}:`, err);
                                }
                            } catch (err) {
                                console.error(`Error processing cover image for ${filename}:`, err);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error reading ID3 tags from ${filename}:`, error);
                }
            }

            // Save track to database - using create instead of directly using the constructor
            await Track.create({
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
    } catch (error) {
        console.error('Error syncing tracks:', error);
        return false;
    }
}

// Get all tracks with optional filtering and pagination
export async function getTracks(options: {
    search?: string;
    page?: number;
    limit?: number;
    trackIds?: string[];
}) {
    const { search, page = 1, limit = 10, trackIds } = options;
    const offset = (page - 1) * limit;

    try {
        const whereClause: any = {};

        if (trackIds && trackIds.length > 0) {
            whereClause.id = trackIds;
        }

        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { author: { [Op.like]: `%${search}%` } },
                { album: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Track.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['title', 'ASC']]
        });

        return {
            tracks: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        };
    } catch (error) {
        console.error('Error fetching tracks:', error);
        throw error;
    }
}

export default { syncTracks, getTracks };