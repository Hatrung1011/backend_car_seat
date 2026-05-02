import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { signToken, verifyToken } from '../lib/jwt.js';

const router = Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng nhập email và mật khẩu',
            });
        }

        const { rows } = await pool.query(
            'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({
                success: false,
                error: 'Email hoặc mật khẩu không đúng',
            });
        }

        const token = signToken({
            sub: String(user.id),
            email: user.email,
            role: 'admin',
        });

        res.json({
            success: true,
            data: {
                token,
                user: {
                    email: user.email,
                    role: 'admin',
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/check', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: false, authenticated: false });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const { rows } = await pool.query(
            'SELECT id, email FROM admin_users WHERE id = $1',
            [Number(decoded.sub)]
        );
        const user = rows[0];
        if (!user) {
            return res.json({ success: false, authenticated: false });
        }
        res.json({
            success: true,
            authenticated: true,
            user: { email: user.email, role: 'admin' },
        });
    } catch {
        res.json({ success: false, authenticated: false });
    }
});

export default router;
