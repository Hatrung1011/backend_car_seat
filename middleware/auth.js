import { verifyToken } from '../lib/jwt.js';

export async function authMiddleware(req, res, next) {
    if (req.path === '/api/auth/login' || req.path === '/api/auth/check') {
        return next();
    }

    if (req.method === 'GET' && (
        req.path.startsWith('/api/products') ||
        req.path.startsWith('/api/brands') ||
        req.path.startsWith('/api/categories')
    )) {
        return next();
    }

    if (!req.path.startsWith('/api')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Không có quyền truy cập' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        req.user = { id: decoded.sub, email: decoded.email, role: decoded.role || 'admin' };
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Token hết hạn hoặc không hợp lệ' });
    }
}
