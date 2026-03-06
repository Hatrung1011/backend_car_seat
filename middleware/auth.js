import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nhat-ha-cms-secret-key-change-in-production';

export function authMiddleware(req, res, next) {
    // Skip auth for login route and static files
    if (req.path === '/api/auth/login' || req.path === '/api/auth/check') {
        return next();
    }

    // Allow public GET access to products, brands, categories
    if (req.method === 'GET' && (
        req.path.startsWith('/api/products') ||
        req.path.startsWith('/api/brands') ||
        req.path.startsWith('/api/categories')
    )) {
        return next();
    }

    // Only protect /api routes
    if (!req.path.startsWith('/api')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Không có quyền truy cập' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token hết hạn hoặc không hợp lệ' });
    }
}

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
