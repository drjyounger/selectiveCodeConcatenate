// src/services/FileService.ts

import { FileNode, ApiResponse } from '../types/index';
import {
  getLocalDirectoryTree,
  readLocalFile,
} from './LocalFileService';

interface ProcessingStats {
  processedFiles: number;
  ignoredFiles: number;
  skippedDirs: number;
  errors: number;
  totalTokens: number;
}

/**
 * Directories or subdirectories to ignore
 */
const STANDARD_DIRS = new Set([
  'venv', '__pycache__', 'node_modules', 'lib', 'site-packages',
  'dist', 'build', 'env', '.git', '.idea', '.vscode', '.svn', 'vendor'
]);

/**
 * File extensions considered "text" for concatenation
 */
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml',
  '.yaml', '.yml', '.sh', '.bat', '.ps1', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.ts', '.jsx',
  '.tsx', '.vue', '.scala', '.kt', '.groovy', '.gradle', '.sql',
  '.gitignore', '.env', '.cfg', '.ini', '.toml', '.csv'
]);

/**
 * Helper to decide if a given file is textual
 */
export const isTextFile = (filename: string): boolean => {
  if (filename === '.cursorrules') return true;
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
};

/**
 * Helper to skip "standard" directories
 */
export const isStandardLibraryPath = (path: string): boolean => {
  return Array.from(STANDARD_DIRS).some((dir) =>
    path.toLowerCase().includes(`/${dir.toLowerCase()}/`)
  );
};

/**
 * Map file extensions to syntax highlights (for the Markdown code fence)
 */
export const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const languageMap: Record<string, string> = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.html': 'html',
    '.css': 'css',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
    '.go': 'go',
    '.rs': 'rust',
    '.sql': 'sql',
  };
  return languageMap[ext] || 'text';
};

/**
 * Estimate tokens in text using a simple approximation
 */
const estimateTokens = (text: string): number => {
  // Rough estimation: average English word is 4.7 characters
  // GPT tokens are roughly 4 characters per token
  return Math.ceil(text.length / 4);
};

/**
 * Process .env file content to mask sensitive values
 */
const maskEnvFileContent = (content: string): string => {
  // Mask sensitive values in .env files
  if (!content) return content;
  
  return content.replace(
    /^([A-Za-z0-9_]+)[\s=]+['"]?([^'"\n]+)['"]?$/gm,
    (_, key, value) => {
      if (key.toLowerCase().includes('key') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('password')) {
        return `${key}=[MASKED]`;
      }
      return `${key}=${value}`;
    }
  );
};

/**
 * getDirectoryTree
 * Recursively fetches a local directory tree, then converts it
 * into a FileNode structure, skipping standard directories.
 */
export const getDirectoryTree = async (rootPath: string): Promise<FileNode> => {
  try {
    const normalizedPath = rootPath.trim();
    if (!normalizedPath) {
      throw new Error('Root path cannot be empty');
    }

    console.log('Attempting to fetch directory tree for:', normalizedPath);
    
    const rawTree = await getLocalDirectoryTree(normalizedPath);
    
    if (!rawTree || typeof rawTree !== 'object') {
      throw new Error('Invalid directory tree response');
    }

    const buildTree = (entry: any): FileNode | null => {
      if (!entry || !entry.path) {
        return null;
      }

      if (isStandardLibraryPath(entry.path)) {
        return null;
      }

      const node: FileNode = {
        path: entry.path,
        type: entry.type,
        children: [],
      };

      if (entry.type === 'directory' && entry.children) {
        for (const child of entry.children) {
          const childNode = buildTree(child);
          if (childNode) {
            node.children?.push(childNode);
          }
        }
      }
      return node;
    };

    const treeNode = buildTree(rawTree);
    if (!treeNode) {
      throw new Error('Root directory is excluded or invalid');
    }
    return treeNode;
  } catch (error) {
    console.error('Error in getDirectoryTree:', error);
    throw error;
  }
};

interface FileServiceResponse {
  success: boolean;
  data?: string;
  error?: string;
}

const IGNORED_FILE_TYPES = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.pyc', '.class'
]);

/**
 * concatenateFiles
 * Enhanced version matching Python script functionality
 */
export const concatenateFiles = async (
  filePaths: string[],
  rootPath: string
): Promise<FileServiceResponse> => {
  try {
    const stats: ProcessingStats = {
      processedFiles: 0,
      ignoredFiles: 0,
      skippedDirs: 0,
      errors: 0,
      totalTokens: 0
    };

    let concatenated = '# Codebase Snapshot\n\n';

    // Generate table of contents
    concatenated += '## Table of Contents\n\n';
    filePaths.forEach(path => {
      const relativePath = path.replace(rootPath, '').replace(/^\//, '');
      concatenated += `- ${relativePath}\n`;
    });
    concatenated += '\n---\n\n';

    // Process each file
    for (const filePath of filePaths) {
      try {
        const extension = filePath.slice(filePath.lastIndexOf('.'));
        
        // Skip binary and other ignored file types
        if (IGNORED_FILE_TYPES.has(extension.toLowerCase())) {
          stats.ignoredFiles++;
          continue;
        }

        const response = await readLocalFile(filePath);
        if (!response.success || !response.content) {
          throw new Error(response.error || 'Failed to read file');
        }

        const relativePath = filePath.replace(rootPath, '').replace(/^\//, '');
        let content = response.content;

        // Apply .env masking if needed
        if (filePath.endsWith('.env') || filePath.includes('.env.')) {
          content = maskEnvFileContent(content);
        }

        // Add file header and content
        concatenated += `## File: ${relativePath}\n\n\`\`\`${extension}\n${content}\n\`\`\`\n\n`;
        
        stats.processedFiles++;
        stats.totalTokens += estimateTokens(content);
      } catch (err) {
        stats.errors++;
        console.error(`Error processing file ${filePath}:`, err);
      }
    }

    // Add processing statistics
    concatenated += '## Processing Statistics\n\n';
    concatenated += `- Files processed: ${stats.processedFiles}\n`;
    concatenated += `- Files ignored: ${stats.ignoredFiles}\n`;
    concatenated += `- Directories skipped: ${stats.skippedDirs}\n`;
    concatenated += `- Errors encountered: ${stats.errors}\n`;
    concatenated += `- Estimated tokens: ${stats.totalTokens.toLocaleString()}\n`;

    return {
      success: true,
      data: concatenated
    };
  } catch (err) {
    console.error('Error in concatenateFiles:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to concatenate files'
    };
  }
};
