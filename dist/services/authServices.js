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
exports.setupInitialUser = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../db/models");
const uuid_1 = require("uuid");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '7d';
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
const setupInitialUser = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultUser = yield models_1.User.findOne({ where: { username: 'user' } });
        if (!defaultUser) {
            // Create a new User instance using proper method
            yield models_1.User.create({
                id: (0, uuid_1.v4)(),
                username: 'user',
                email: 'user@example.com',
                password: 'password123', // Will be hashed by the model hook
            });
            console.log('Default user created');
        }
    }
    catch (error) {
        console.error('Error creating default user:', error);
        throw error; // Rethrow to handle in caller
    }
});
exports.setupInitialUser = setupInitialUser;
//# sourceMappingURL=authServices.js.map