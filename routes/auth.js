import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nhat-ha-cms-secret-key-change-in-production';

// Default admin credentials (override via env vars)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'nhathastore2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng nhập tên đăng nhập và mật khẩu',
            });
        }

        // Check username
        if (username !== ADMIN_USERNAME) {
            return res.status(401).json({
                success: false,
                error: 'Tên đăng nhập hoặc mật khẩu không đúng',
            });
        }

        // Check password — use hash if available, otherwise plain text
        let passwordValid = false;
        if (ADMIN_PASSWORD_HASH) {
            passwordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        } else {
            passwordValid = password === ADMIN_PASSWORD_PLAIN;
        }

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Tên đăng nhập hoặc mật khẩu không đúng',
            });
        }

        // Generate JWT
        const token = generateToken({
            username: ADMIN_USERNAME,
            role: 'admin',
        });

        res.json({
            success: true,
            data: {
                token,
                user: { username: ADMIN_USERNAME, role: 'admin' },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/auth/check — verify token is still valid
router.get('/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: false, authenticated: false });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, authenticated: true, user: decoded });
    } catch {
        res.json({ success: false, authenticated: false });
    }
});

export default router;
