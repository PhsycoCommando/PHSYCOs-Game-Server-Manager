const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

// GET /api/files?path=<filepath> - Get file content
router.get('/', async (req, res) => {
    const { filepath } = req.query;
    if (!filepath) {
        return res.status(400).json({ message: 'Filepath query parameter is required' });
    }

    try {
        // Basic security check to prevent directory traversal
        // It's not perfect, but it's a start.
        // It ensures the path is within the project directory.
        const projectRoot = path.resolve(__dirname, '../../..');
        const absolutePath = path.resolve(projectRoot, filepath);

        if (!absolutePath.startsWith(projectRoot)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const content = await fs.readFile(absolutePath, 'utf-8');
        res.send(content);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading file', error });
    }
});

// POST /api/files?path=<filepath> - Save file content
router.post('/', async (req, res) => {
    const { filepath } = req.query;
    const { content } = req.body;

    if (!filepath) {
        return res.status(400).json({ message: 'Filepath query parameter is required' });
    }

    try {
        const projectRoot = path.resolve(__dirname, '../../..');
        const absolutePath = path.resolve(projectRoot, filepath);

        if (!absolutePath.startsWith(projectRoot)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await fs.writeFile(absolutePath, content, 'utf-8');
        res.json({ message: 'File saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving file', error });
    }
});


module.exports = router; 