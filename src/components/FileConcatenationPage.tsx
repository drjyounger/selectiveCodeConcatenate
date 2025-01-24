import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import FileTree from './FileTree';
import { formatConcatenatedFiles } from '../utils/fileFormatter';

const FileConcatenationPage: React.FC = () => {
  const [rootPath, setRootPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [concatenatedContent, setConcatenatedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBrowse = () => {
    if (!rootPath.trim()) {
      setError('Please enter a valid path');
      return;
    }
    setError(null);
  };

  const handleFileSelect = async (paths: string[]) => {
    setIsProcessing(true);
    try {
      let allFiles: string[] = [];
      for (const path of paths) {
        try {
          const response = await fetch('/api/local/directory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: path })
          });
          const data = await response.json();
          
          if (data.success) {
            if (data.data && data.data.length > 0) {
              const files = data.data
                .filter((item: any) => !item.isDirectory)
                .map((item: any) => item.id);
              allFiles = [...allFiles, ...files];
            } else {
              allFiles.push(path);
            }
          }
        } catch (err) {
          console.error(`Error processing path ${path}:`, err);
        }
      }
      
      const uniqueFiles = Array.from(new Set(allFiles));
      setSelectedFiles(uniqueFiles);
      
      if (uniqueFiles.length === 0) {
        setError('No files found in selected paths');
      } else {
        setError(null);
      }
    } catch (err) {
      setError('Error processing selected paths');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConcatenate = async () => {
    if (selectedFiles.length === 0) {
      setError('No files selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const getFileContent = async (path: string): Promise<string> => {
        const response = await fetch('/api/local/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: path })
        });
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to read file');
        }
        return data.content;
      };

      const formattedContent = await formatConcatenatedFiles(selectedFiles, getFileContent);
      setConcatenatedContent(formattedContent);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to concatenate files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!concatenatedContent) return;
    
    const blob = new Blob([concatenatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'concatenated-files.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          File Concatenation Tool
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Root Directory Path
          </Typography>
          <TextField
            fullWidth
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            placeholder="/path/to/your/project"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleBrowse}
            disabled={loading || !rootPath.trim()}
          >
            Browse Files
          </Button>
        </Box>

        {rootPath && (
          <Box sx={{ mb: 3 }}>
            <FileTree
              rootPath={rootPath}
              onSelect={handleFileSelect}
              onError={(err) => setError(err.message)}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleConcatenate}
            disabled={loading || isProcessing || selectedFiles.length === 0}
          >
            {loading || isProcessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                {loading ? 'Concatenating...' : 'Processing Selection...'}
              </Box>
            ) : (
              'Concatenate Files'
            )}
          </Button>

          {concatenatedContent && (
            <Button
              variant="outlined"
              onClick={handleDownload}
              disabled={loading || isProcessing}
            >
              Download Markdown
            </Button>
          )}
        </Box>

        {concatenatedContent && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Paper
              sx={{
                p: 2,
                maxHeight: '50vh',
                overflow: 'auto',
                backgroundColor: '#f5f5f5'
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {concatenatedContent}
              </pre>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default FileConcatenationPage; 