import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'data', 'uploads');

function publicBase() {
    const b = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';
    return b.replace(/\/$/, '');
}

function toPublicUrl(relativePath) {
    const rel = relativePath.replace(/^\/+/, '');
    return `${publicBase()}/uploads/${rel}`;
}

function parseStoredPath(input) {
    if (!input) return null;
    const s = String(input);
    const idx = s.indexOf('/uploads/');
    if (idx >= 0) return s.slice(idx + '/uploads/'.length);
    return s.replace(/^\/+/, '');
}

router.post('/', async (req, res) => {
    try {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (!buffer.length) {
            return res.status(400).json({ success: false, error: 'Không có file nào được gửi' });
        }

        const contentType = req.headers['content-type'] || 'image/webp';
        const filename = req.headers['x-filename'] || `${Date.now()}.webp`;
        const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `products/${Date.now()}_${safeName}`;
        const absPath = path.join(UPLOAD_ROOT, storagePath);

        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, buffer);

        res.json({
            success: true,
            data: {
                path: storagePath,
                url: toPublicUrl(storagePath),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/', async (req, res) => {
    try {
        const { path: bodyPath } = req.body;
        if (!bodyPath) {
            return res.status(400).json({ success: false, error: 'Thiếu đường dẫn file' });
        }

        const rel = parseStoredPath(bodyPath);
        if (!rel || rel.includes('..')) {
            return res.status(400).json({ success: false, error: 'Đường dẫn không hợp lệ' });
        }

        const absPath = path.join(UPLOAD_ROOT, rel);
        await fs.unlink(absPath).catch(() => {});

        res.json({ success: true, message: 'Đã xóa ảnh' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
