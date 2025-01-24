const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

// Replace the existing readDirRecursive function with this non-recursive version
async function readDir(dirPath) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const results = items.map((item) => {
      const fullPath = path.join(dirPath, item.name);
      return {
        id: fullPath,
        name: item.name,
        isDirectory: item.isDirectory(),
      };
    });
    
    // Add logging to help debug
    console.log(`Successfully processed ${results.length} items in ${dirPath}`);
    return results;
  } catch (error) {
    console.error('Error in readDir:', {
      path: dirPath,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Simplified path safety check that allows project directories
function isPathSafe(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  // Block access to obviously sensitive paths
  const dangerousPatterns = [
    /\/\.ssh\//,
    /\/\.aws\//,
    /\/\.config\//,
    /\/\.bash_history/,
    /\/\.env$/,
    /\/\.env\./,
    /password/i,
    /secret/i,
  ];

  // Allow specific project directories
  const allowedPaths = [
    '/Users/jamesyounger/Dropbox/TempStarsCoding',
    '/Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp'
  ];

  // Check if path is in allowed paths
  if (allowedPaths.some(allowedPath => normalizedPath.startsWith(allowedPath))) {
    return true;
  }

  // Check if path contains dangerous patterns
  if (dangerousPatterns.some(pattern => pattern.test(normalizedPath))) {
    console.log('Blocked access to sensitive path:', normalizedPath);
    return false;
  }

  // By default, be restrictive
  console.log('Path not explicitly allowed:', normalizedPath);
  return false;
}

// Directory listing endpoint
app.post('/api/local/directory', async (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'No folderPath provided' 
      });
    }

    const absolutePath = path.resolve(folderPath);
    console.log('Attempting to read path:', absolutePath);

    if (!isPathSafe(absolutePath)) {
      console.log('Access denied:', absolutePath);
      return res.status(403).json({ 
        success: false, 
        error: 'Access not allowed for security reasons' 
      });
    }

    // Check if path exists and is readable
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error) {
      console.log('Access error:', error);
      return res.status(403).json({
        success: false,
        error: `Cannot access path: ${error.message}`
      });
    }

    // Check if path is a directory or file
    const stats = await fs.stat(absolutePath);
    
    if (stats.isDirectory()) {
      const children = await readDir(absolutePath);
      console.log('Successfully read directory:', absolutePath);
      console.log('Directory contents:', JSON.stringify(children, null, 2));
      
      return res.json({ 
        success: true, 
        data: children,
        type: 'directory'
      });
    } else {
      // If it's a file, return it as a leaf node
      return res.json({
        success: true,
        data: [{
          id: absolutePath,
          name: path.basename(absolutePath),
          isDirectory: false
        }],
        type: 'file'
      });
    }
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return res.status(500).json({ 
      success: false, 
      error: `Failed to read path: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// File reading endpoint
app.post('/api/local/file', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        error: 'No filePath provided' 
      });
    }

    const absolutePath = path.resolve(filePath);
    console.log('Attempting to read file:', absolutePath);

    if (!isPathSafe(absolutePath)) {
      console.log('File access denied:', absolutePath);
      return res.status(403).json({ 
        success: false, 
        error: 'File access not allowed for security reasons' 
      });
    }

    // Check if file exists and is readable
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error) {
      console.log('File access error:', error);
      return res.status(403).json({
        success: false,
        error: `Cannot access file: ${error.message}`
      });
    }

    // Check if path is a directory
    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot read a directory as a file'
      });
    }

    const content = await fs.readFile(absolutePath, 'utf8');
    console.log('Successfully read file:', absolutePath);
    res.json({ success: true, content });
  } catch (error) {
    console.error('File reading error:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to read file: ${error.message}` 
    });
  }
});

const PORT = process.env.REACT_APP_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server is allowing access to project directories');
}); 