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

      // If this is a directory being checked, load all its contents recursively
      for (const node of resData.data) {
        if (node.isDirectory) {
          await loadDirectory(node.id);
        }
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
        body: JSON.stringify({ folderPath: dirPath })
      });
      const resData = await response.json();
      
      if (!resData.success) throw new Error(resData.error);

      let files: string[] = [];
      
      for (const item of resData.data) {
        if (item.isDirectory) {
          // Recursively get files from subdirectory
          const subFiles = await getAllFilesInDirectory(item.id);
          files = [...files, ...subFiles];
        } else {
          files.push(item.id);
        }
      }
      
      return files;
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
        // For directories, get all files recursively
        const filesInDir = await getAllFilesInDirectory(nodePath);
        allFiles = [...allFiles, ...filesInDir];
      } else {
        // For individual files, add directly
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
