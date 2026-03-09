import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

const BUCKET = 'product-images';

// POST /api/upload — Upload image to Supabase Storage
router.post('/', async (req, res) => {
    try {
        // Read raw body as buffer
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (!buffer.length) {
            return res.status(400).json({ success: false, error: 'Không có file nào được gửi' });
        }

        // Get content type and filename from headers
        const contentType = req.headers['content-type'] || 'image/webp';
        const filename = req.headers['x-filename'] || `${Date.now()}.webp`;

        // Build storage path: products/timestamp_filename
        const storagePath = `products/${Date.now()}_${filename}`;

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(data.path);

        res.json({
            success: true,
            data: {
                path: data.path,
                url: urlData.publicUrl,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/upload — Delete image from Supabase Storage
router.delete('/', async (req, res) => {
    try {
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ success: false, error: 'Thiếu đường dẫn file' });
        }

        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([path]);

        if (error) throw error;

        res.json({ success: true, message: 'Đã xóa ảnh' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
