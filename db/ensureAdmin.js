import bcrypt from 'bcrypt';
import { pool } from './pool.js';

/**
 * Seed default brands/categories if empty (same as migration_brands_categories.sql).
 * Create first admin from ADMIN_EMAIL + ADMIN_PASSWORD if no users.
 */
export async function ensureAdminAndSeed() {
    const { rows: brandCount } = await pool.query('SELECT COUNT(*)::int AS c FROM brands');
    if (brandCount[0].c === 0) {
        await pool.query(`
            INSERT INTO brands (name, slug, description, sort_order) VALUES
                ('Nhật Hạ Platinum', 'nhat-ha-platinum', 'Dòng sản phẩm cao cấp nhất', 1),
                ('Nhật Hạ Gold', 'nhat-ha-gold', 'Dòng sản phẩm phổ thông', 2)
            ON CONFLICT (name) DO NOTHING
        `);
    }

    const { rows: catCount } = await pool.query('SELECT COUNT(*)::int AS c FROM categories');
    if (catCount[0].c === 0) {
        await pool.query(`
            INSERT INTO categories (name, slug, description, sort_order) VALUES
                ('Sơ sinh (Infant)', 'infant', 'Ghế dành cho trẻ sơ sinh 0-12 tháng', 1),
                ('Trẻ nhỏ (Toddler)', 'toddler', 'Ghế dành cho trẻ nhỏ 1-4 tuổi', 2),
                ('Trẻ lớn (Child)', 'child', 'Ghế dành cho trẻ lớn 4-12 tuổi', 3)
            ON CONFLICT (name) DO NOTHING
        `);
    }

    const { rows: userCount } = await pool.query('SELECT COUNT(*)::int AS c FROM admin_users');
    if (userCount[0].c > 0) return;

    const email = process.env.ADMIN_EMAIL || 'admin@localhost';
    const plain = process.env.ADMIN_PASSWORD;
    if (!plain) {
        console.warn('No admin users and ADMIN_PASSWORD not set — set ADMIN_PASSWORD to create first admin.');
        return;
    }

    const password_hash = await bcrypt.hash(plain, 10);
    await pool.query(
        'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)',
        [email.trim().toLowerCase(), password_hash]
    );
    console.log(`Created admin user: ${email}`);
}
