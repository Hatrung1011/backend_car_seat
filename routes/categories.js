import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// GET /api/categories — list all categories
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/categories
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, icon, is_active, sort_order } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ success: false, error: 'Tên và slug là bắt buộc' });
        }

        const { data, error } = await supabase
            .from('categories')
            .insert({ name, slug, description: description || '', icon: icon || '', is_active: is_active !== false, sort_order: sort_order || 0 })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, slug, description, icon, is_active, sort_order } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (slug !== undefined) updates.slug = slug;
        if (description !== undefined) updates.description = description;
        if (icon !== undefined) updates.icon = icon;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true, message: 'Đã xóa danh mục' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
