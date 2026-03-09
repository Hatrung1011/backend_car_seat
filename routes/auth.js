import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// POST /api/auth/login — Authenticate via Supabase Auth
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng nhập email và mật khẩu',
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) {
            return res.status(401).json({
                success: false,
                error: 'Email hoặc mật khẩu không đúng',
            });
        }

        res.json({
            success: true,
            data: {
                token: data.session.access_token,
                user: {
                    email: data.user.email,
                    role: 'admin',
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/auth/check — verify Supabase token is still valid
router.get('/check', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: false, authenticated: false });
    }

    try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
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
