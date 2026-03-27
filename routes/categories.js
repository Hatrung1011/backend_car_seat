import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM categories ORDER BY sort_order ASC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
        if (!rows[0]) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, slug, description, icon, is_active, sort_order } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ success: false, error: 'Tên và slug là bắt buộc' });
        }

        const { rows } = await pool.query(
            `INSERT INTO categories (name, slug, description, icon, is_active, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [
                name,
                slug,
                description || '',
                icon || '',
                is_active !== false,
                sort_order || 0,
            ]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, slug, description, icon, is_active, sort_order } = req.body;
        const fields = [];
        const vals = [];
        let i = 1;

        if (name !== undefined) { fields.push(`name = $${i++}`); vals.push(name); }
        if (slug !== undefined) { fields.push(`slug = $${i++}`); vals.push(slug); }
        if (description !== undefined) { fields.push(`description = $${i++}`); vals.push(description); }
        if (icon !== undefined) { fields.push(`icon = $${i++}`); vals.push(icon); }
        if (is_active !== undefined) { fields.push(`is_active = $${i++}`); vals.push(is_active); }
        if (sort_order !== undefined) { fields.push(`sort_order = $${i++}`); vals.push(sort_order); }

        if (!fields.length) {
            return res.status(400).json({ success: false, error: 'Không có dữ liệu cập nhật' });
        }

        vals.push(req.params.id);
        const { rows, rowCount } = await pool.query(
            `UPDATE categories SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );
        if (!rowCount) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        if (!rowCount) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, message: 'Đã xóa danh mục' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
