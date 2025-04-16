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
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = __importDefault(require("./db/config"));
const authServices_1 = require("./services/authServices");
const trackServices_1 = require("./services/trackServices");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const tracks_1 = __importDefault(require("./routes/tracks"));
const playlists_1 = __importDefault(require("./routes/playlists"));
const users_1 = __importDefault(require("./routes/users"));
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'https://3000-idx-musically-1743873794879.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://3000-idx-musically-1743873794879.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/tracks', tracks_1.default);
app.use('/api/playlists', playlists_1.default);
app.use('/api/users', users_1.default);
// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
``;
// Initialize database and start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Sync database models
        yield config_1.default.sync();
        console.log('Database synchronized');
        // Setup initial user if none exists
        yield (0, authServices_1.setupInitialUser)();
        // Sync tracks on startup
        yield (0, trackServices_1.syncTracks)();
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
    }
});
startServer();
//# sourceMappingURL=index.js.map