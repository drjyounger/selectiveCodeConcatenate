// src/components/FileTree.tsx

import React, { useEffect, useState } from 'react';
import type { DataNode } from 'rc-tree/lib/interface';
import Tree from 'rc-tree';
import type { Key } from 'rc-tree/lib/interface';
import 'rc-tree/assets/index.css';
import { Box } from '@mui/material';

interface ServerNode {
  id: string;
  name: string;
  isDirectory: boolean;
}

interface FileTreeProps {
  rootPath: string;
  onSelect: (paths: string[]) => void;
  onError: (err: Error) => void;
}

interface NodeMap {
  [key: string]: {
    isDirectory: boolean;
    children: string[];
  };
}

// Add these constants
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.yaml', '.yml',
  '.sh', '.bat', '.ps1', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx', '.vue', '.scala', '.kt', '.groovy',
  '.gradle', '.sql', '.gitignore', '.env', '.cfg', '.ini', '.toml', '.csv'
]);

const isTextFile = (filename: string): boolean => {
  if (filename === '.cursorrules') return true;
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
};

const FileTree: React.FC<FileTreeProps> = ({ rootPath, onSelect, onError }) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [nodeMap, setNodeMap] = useState<NodeMap>({});

  useEffect(() => {
    if (!rootPath) return;
    loadDirectory(rootPath, true);
  }, [rootPath]);

  const loadDirectory = async (dirPath: string, isRoot: boolean = false) => {
    try {
      const response = await fetch('/api/local/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: dirPath })
      });
      const resData = await response.json();
      
      if (!resData.success) throw new Error(resData.error);
      
      const newData = convertToRcTreeData(resData.data);
      
      // Update node map
      const newNodeMap = { ...nodeMap };
      resData.data.forEach((node: ServerNode) => {
        newNodeMap[node.id] = {
          isDirectory: node.isDirectory,
          children: []
        };
      });
      setNodeMap(newNodeMap);

      if (isRoot) {
        setTreeData(newData);
      } else {
        setTreeData(updateTreeDataWithChildren(treeData, dirPath, newData));
      }
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Failed to load directory'));
    }
  };

  const getAllFilesInDirectory = async (dirPath: string): Promise<string[]> => {
    try {
      const response = await fetch('/api/local/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          folderPath: dirPath,
          recursive: true  // Always request recursive listing
        })
      });
      
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error);

      // Since we're getting all files recursively from the server,
      // we can simply return the file paths
      return resData.data
        .filter((item: ServerNode) => !item.isDirectory)
        .map((item: ServerNode) => item.id);
    } catch (err) {
      console.error('Error scanning directory:', err);
      return [];
    }
  };

  const updateTreeDataWithChildren = (
    data: DataNode[],
    parentKey: string,
    children: DataNode[]
  ): DataNode[] => {
    return data.map(node => {
      if (node.key === parentKey) {
        return { ...node, children };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeDataWithChildren(node.children, parentKey, children)
        };
      }
      return node;
    });
  };

  const convertToRcTreeData = (nodes: ServerNode[]): DataNode[] => {
    return nodes.map((item) => ({
      key: item.id,
      title: item.name,
      isLeaf: !item.isDirectory,
      children: item.isDirectory ? [] : undefined
    }));
  };

  const onLoadData = async (treeNode: DataNode) => {
    if (treeNode.isLeaf || (treeNode.children && treeNode.children.length > 0)) {
      return Promise.resolve();
    }
    return loadDirectory(treeNode.key as string);
  };

  const onCheck = async (checkedKeys: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
    const checked = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    let allFiles: string[] = [];

    for (const key of checked) {
      const nodePath = key.toString();
      const node = nodeMap[nodePath];

      if (node?.isDirectory) {
        // Get all files recursively
        const filesInDir = await getAllFilesInDirectory(nodePath);
        allFiles = [...allFiles, ...filesInDir];
      } else if (isTextFile(nodePath)) {
        allFiles.push(nodePath);
      }
    }

    // Remove duplicates and notify parent
    const uniqueFiles = Array.from(new Set(allFiles));
    onSelect(uniqueFiles);
  };

  const onExpand = (expandedKeys: Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  return (
    <Box sx={{ maxHeight: '60vh', overflow: 'auto', bgcolor: 'background.paper' }}>
      <Tree
        checkable
        treeData={treeData}
        loadData={onLoadData}
        onCheck={onCheck}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        defaultExpandAll={false}
        autoExpandParent={true}
        checkStrictly={false} // This enables parent-child checkbox relationship
      />
    </Box>
  );
};

export default FileTree;
