import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;

export function requireJwtSecret() {
    if (!secret || secret.length < 16) {
        console.error('Set JWT_SECRET (min 16 chars) in .env');
        process.exit(1);
    }
    return secret;
}

export function signToken(payload) {
    return jwt.sign(payload, requireJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token) {
    return jwt.verify(token, requireJwtSecret());
}
