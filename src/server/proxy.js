const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

// Helper function that reads a directory recursively.
async function readDirRecursive(dirPath) {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const result = [];
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    result.push({
      id: fullPath,
      name: item.name,
      isDirectory: item.isDirectory(),
      children: item.isDirectory() ? await readDirRecursive(fullPath) : []
    });
  }
  return result;
}

// Basic "isPathSafe" check to avoid scanning system folders
function isPathSafe(filePath) {
  const sensitivePatterns = [
    /\/\.git\//,
    /\/node_modules\//,
    /\/\.env/,
    /\/\.ssh\//,
    /\/\.aws\//
  ];
  return !sensitivePatterns.some((pattern) => pattern.test(filePath));
}

// 1) POST /api/local/directory
app.post('/api/local/directory', async (req, res) => {
  try {
    const { rootPath } = req.body;
    if (!rootPath) throw new Error('No rootPath provided');

    const absoluteRoot = path.resolve(rootPath);
    if (!isPathSafe(absoluteRoot)) {
      return res.status(403).json({ success: false, error: 'Directory not allowed' });
    }

    const children = await readDirRecursive(absoluteRoot);
    res.json({ success: true, data: children });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2) POST /api/local/file
app.post('/api/local/file', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) throw new Error('No filePath provided');
    const absolutePath = path.resolve(filePath);
    if (!isPathSafe(absolutePath)) {
      return res.status(403).json({ success: false, error: 'File path not allowed' });
    }

    const content = await fs.readFile(absolutePath, 'utf8');
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 