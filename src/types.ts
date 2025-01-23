export interface FileNode {
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface TreeNode {
  id: string;
  name: string;
  isDirectory: boolean;
  children?: TreeNode[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProcessingStats {
  processedFiles: number;
  ignoredFiles: number;
  skippedDirs: number;
  errors: number;
  totalTokens: number;
} 