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
import { concatenateFiles } from '../services/FileService';

const FileConcatenationPage: React.FC = () => {
  const [rootPath, setRootPath] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concatenatedContent, setConcatenatedContent] = useState<string>('');

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRootPath(e.target.value);
    setShowTree(false);
    setError(null);
  };

  const handleFetchDirectory = () => {
    const trimmedPath = rootPath.trim();
    if (!trimmedPath) {
      setError('Please enter a valid root directory path');
      return;
    }
    setShowTree(true);
    setError(null);
  };

  const handleConcatenate = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await concatenateFiles(selectedFiles, rootPath);
      if (result.success && result.data) {
        setConcatenatedContent(result.data);
      } else {
        setError(result.error || 'Failed to concatenate files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to concatenate files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([concatenatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'concatenated-files.md';
    link.click();
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
            onChange={handlePathChange}
            placeholder="/path/to/your/project"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleFetchDirectory}
            disabled={loading || !rootPath.trim()}
          >
            Browse Files
          </Button>
        </Box>

        {showTree && (
          <Box sx={{ mb: 3 }}>
            <FileTree
              rootPath={rootPath}
              onSelect={setSelectedFiles}
              onError={(error: Error) => setError(error.message)}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleConcatenate}
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Concatenate Files'}
          </Button>
          {concatenatedContent && (
            <Button
              variant="outlined"
              onClick={handleDownload}
              disabled={loading}
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