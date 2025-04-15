import jwt from 'jsonwebtoken';
import { User } from '../db/models';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '7d';

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): { id: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string };
  } catch (error) {
    return null;
  }
};

export const setupInitialUser = async (): Promise<void> => {
  try {
    const defaultUser = await User.findOne({ where: { username: 'user' } });
    
    if (!defaultUser) {
      // Create a new User instance using proper method
      await User.create({
        id: uuidv4(),
        username: 'user',
        email: 'user@example.com',
        password: 'password123', // Will be hashed by the model hook
      });
      console.log('Default user created');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
    throw error; // Rethrow to handle in caller
  }
};