import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Một nguồn mật khẩu cho Docker Compose: POSTGRES_* khớp service `db`.
 * Nếu vẫn đặt DATABASE_URL tay mà khác POSTGRES_PASSWORD → lỗi 28P01.
 * Ưu tiên ghép URL từ POSTGRES_USER/PASSWORD/DB khi đủ biến (password được encode đúng).
 */
function resolveConnectionString() {
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DB;

    if (user && password !== undefined && password !== '' && database) {
        const host = process.env.POSTGRES_HOST || 'db';
        const port = process.env.POSTGRES_PORT || '5432';
        return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    }

    const url = process.env.DATABASE_URL;
    if (url) return url;

    console.error(
        'Missing DB config: set DATABASE_URL, or POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB (recommended with docker-compose).'
    );
    process.exit(1);
}

const connectionString = resolveConnectionString();

export const pool = new Pool({ connectionString });
