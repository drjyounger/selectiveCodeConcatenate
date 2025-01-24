interface TableOfContentsEntry {
  path: string;
  lineNumber: number;
}

export const formatConcatenatedFiles = async (
  selectedFiles: string[],
  getFileContent: (path: string) => Promise<string>
): Promise<string> => {
  const tableOfContents: TableOfContentsEntry[] = [];
  let concatenatedContent = '';
  let currentLine = 1;

  // Generate table of contents header
  concatenatedContent += '# This is one large file that contains many files concatenated together.  The file starts with a Table of Contents for this file, which lists every file in that was concatenated along with the file paths.  The table of contents ends with "----", after which you will find the actual file contents, with each file starting with "## File {#}":\n\n';

  // First pass: build table of contents
  for (const filePath of selectedFiles) {
    const entry: TableOfContentsEntry = {
      path: filePath,
      lineNumber: currentLine
    };
    tableOfContents.push(entry);
    
    // Add entry to table of contents
    concatenatedContent += `${tableOfContents.length}. [${filePath}](#file-${tableOfContents.length})\n`;
  }

  concatenatedContent += '\n---\n\n';

  // Second pass: add file contents
  for (let i = 0; i < selectedFiles.length; i++) {
    const filePath = selectedFiles[i];
    let content = await getFileContent(filePath);

    // Mask sensitive data in .env files
    if (filePath.endsWith('.env')) {
      content = maskEnvContent(content);
    }

    // Add file header with full path
    concatenatedContent += `\n\n## File ${i + 1}: \`${filePath}\`\n\n`;
    
    // Add code fence with appropriate language
    const language = getLanguageFromExtension(filePath);
    concatenatedContent += '```' + language + '\n';
    concatenatedContent += content;
    
    // Ensure content ends with newline before closing fence
    if (!content.endsWith('\n')) {
      concatenatedContent += '\n';
    }
    concatenatedContent += '```\n\n';
    concatenatedContent += '---\n';

    // Update current line count for next file
    currentLine += content.split('\n').length + 6; // +6 for the added markdown formatting lines
  }

  return concatenatedContent;
};

const maskEnvContent = (content: string): string => {
  return content.replace(
    /^([A-Za-z0-9_]+)[\s=]+['"]?([^'"\n]+)['"]?$/gm,
    (match, key, value) => {
      const sensitivePatterns = [
        /key/i,
        /token/i,
        /secret/i,
        /password/i,
        /auth/i,
        /pwd/i,
        /credential/i
      ];
      
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        return `${key}=[MASKED]`;
      }
      return match;
    }
  );
};

const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'txt': 'plaintext',
    'xml': 'xml',
    'dockerfile': 'dockerfile',
    'gitignore': 'plaintext',
    'env': 'plaintext'
  };

  return languageMap[ext] || 'plaintext';
}; 