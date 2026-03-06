import supabase from '../db/supabase.js';

/**
 * Auth middleware — verifies Supabase JWT token from Authorization header.
 * Protects routes by requiring a valid authenticated user.
 */
export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized — missing or invalid token',
            });
        }

        const token = authHeader.split(' ')[1];

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized — invalid or expired token',
            });
        }

        // Attach user to request for downstream use
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized — authentication failed',
        });
    }
}
