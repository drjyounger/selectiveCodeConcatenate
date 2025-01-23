// src/components/FileTree.tsx

import React, { useEffect, useState } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, Checkbox, Typography } from '@mui/material';
import { Folder, InsertDriveFile } from '@mui/icons-material';
import { readLocalDirectory, TreeNode } from '../services/LocalFileService';

interface FileTreeProps {
  rootPath: string;
  onSelect: (files: string[]) => void;
  onError: (error: Error) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ rootPath, onSelect, onError }) => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const response = await readLocalDirectory(rootPath);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch directory');
        }
        setTreeData({
          id: rootPath,
          name: rootPath.split('/').pop() || rootPath,
          isDirectory: true,
          children: response.data
        });
      } catch (err: any) {
        onError(err);
      }
    };

    if (rootPath) {
      fetchDirectory();
    }
  }, [rootPath, onError]);

  const handleToggleSelection = (nodeId: string, isDirectory: boolean) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(nodeId)) {
        newSelection.delete(nodeId);
      } else {
        newSelection.add(nodeId);
      }
      
      if (isDirectory && treeData) {
        const updateChildren = (node: TreeNode) => {
          if (node.id === nodeId) {
            if (newSelection.has(nodeId)) {
              const addAllChildren = (n: TreeNode) => {
                if (!n.isDirectory) {
                  newSelection.add(n.id);
                }
                n.children?.forEach(addAllChildren);
              };
              node.children?.forEach(addAllChildren);
            } else {
              const removeAllChildren = (n: TreeNode) => {
                newSelection.delete(n.id);
                n.children?.forEach(removeAllChildren);
              };
              node.children?.forEach(removeAllChildren);
            }
          } else {
            node.children?.forEach(updateChildren);
          }
        };
        
        updateChildren(treeData);
      }

      const result = Array.from(newSelection);
      onSelect(result.filter(id => !id.endsWith('/')));
      return result;
    });
  };

  const renderTree = (node: TreeNode) => {
    const isSelected = selectedItems.includes(node.id);
    
    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleToggleSelection(node.id, node.isDirectory);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {node.isDirectory ? <Folder color="primary" /> : <InsertDriveFile />}
            <Typography sx={{ ml: 1 }}>{node.name}</Typography>
          </Box>
        }
      >
        {Array.isArray(node.children) && node.children.map((child) => renderTree(child))}
      </TreeItem>
    );
  };

  if (!treeData) return null;

  return (
    <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
      <SimpleTreeView
        expandedItems={expanded}
        onExpandedItemsChange={(event: React.SyntheticEvent, nodeIds: string[]) => setExpanded(nodeIds)}
      >
        {renderTree(treeData)}
      </SimpleTreeView>
    </Box>
  );
};

export default FileTree;
