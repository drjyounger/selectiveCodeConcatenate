Migration from v6 to v7
This guide describes the changes needed to migrate the Tree View from v6 to v7.
ads via Carbon
Start Your Web Dev Career! Learn JavaScript, CSS & more with Frontend Masters today!
ads via Carbon

Introduction

This is a reference guide for upgrading @mui/x-tree-view from v6 to v7. To read more about the changes from the new major, check out the blog post about the release of MUI X v7.

Start using the new release

In package.json, change the version of the Tree View package to ^7.0.0.

-"@mui/x-tree-view": "^6.0.0",
+"@mui/x-tree-view": "^7.0.0",

Copy
Update @mui/material package

To have the option of using the latest API from @mui/material, the package peer dependency version has been updated to ^5.15.14. It is a change in minor version only, so it should not cause any breaking changes. Please update your @mui/material package to this or a newer version.

Run codemods

The preset-safe codemod will automatically adjust the bulk of your code to account for breaking changes in v7. You can run v7.0.0/tree-view/preset-safe targeting only Tree View or v7.0.0/preset-safe to target other MUI X components like the Data Grid as well.

You can either run it on a specific file, folder, or your entire codebase when choosing the <path> argument.

// Tree View specific
npx @mui/x-codemod@latest v7.0.0/tree-view/preset-safe <path>

// Target other MUI X components as well
npx @mui/x-codemod@latest v7.0.0/preset-safe <path>

Copy
If you want to run the codemods one by one, check out the codemods included in the preset-safe codemod for the Tree View for more details.

Breaking changes that are handled by preset-safe codemod are denoted by a ✅ emoji in the table of contents on the right side of the screen or next to the specific point that is handled by it.

If you have already applied the v7.0.0/tree-view/preset-safe (or v7.0.0/preset-safe) codemod, then you should not need to take any further action on these items. If there's a specific part of the breaking change that is not part of the codemod or needs some manual work, it will be listed in the end of each section.

All other changes must be handled manually.

Not all use cases are covered by codemods. In some scenarios, like props spreading, cross-file dependencies, etc., the changes are not properly identified and therefore must be handled manually.

For example, if a codemod tries to rename a prop, but this prop is hidden with the spread operator, it won't be transformed as expected.

<RichTreeView {...newProps} />

Copy
After running the codemods, make sure to test your application and that you don't have any console errors.

Feel free to open an issue for support if you need help to proceed with your migration.

Breaking changes

Since v7 is a major release, it contains changes that affect the public API. These changes were done for consistency, improved stability and to make room for new features.

Drop the legacy bundle

The support for IE 11 has been removed from all MUI X packages. The legacy bundle that used to support old browsers like IE 11 is no longer included.

If you need support for IE 11, you will need to keep using the latest version of the v6 release.

Drop Webpack 4 support

Dropping old browsers support also means that we no longer transpile some features that are natively supported by modern browsers – like Nullish Coalescing and Optional Chaining.

These features are not supported by Webpack 4, so if you are using Webpack 4, you will need to transpile these features yourself or upgrade to Webpack 5.

Here is an example of how you can transpile these features on Webpack 4 using the @babel/preset-env preset:

 // webpack.config.js

 module.exports = (env) => ({
   // ...
   module: {
     rules: [
       {
         test: /\.[jt]sx?$/,
-        exclude: /node_modules/,
+        exclude: [
+          {
+            test: path.resolve(__dirname, 'node_modules'),
+            exclude: [path.resolve(__dirname, 'node_modules/@mui/x-tree-view')],
+          },
+        ],
       },
     ],
   },
 });

Copy
✅ Rename nodeId to itemId

The required nodeId prop used by the Tree Item has been renamed to itemId for consistency:

 <TreeView>
-  <TreeItem label="Item 1" nodeId="one">
+  <TreeItem label="Item 1" itemId="one">
 </TreeView>

Copy
The same change has been applied to the ContentComponent prop:

 const CustomContent = React.forwardRef((props, ref) => {
-  const id = props.nodeId;
+  const id = props.itemId;
   // Render some UI
 });

 function App() {
   return (
     <SimpleTreeView>
       <TreeItem ContentComponent={CustomContent} />
     </SimpleTreeView>
   )
 }

Copy
✅ Use Simple Tree View instead of Tree View

The <TreeView /> component has been deprecated and will be removed in the next major. You can start replacing it with the new <SimpleTreeView /> component which has exactly the same API:

-import { TreeView } from '@mui/x-tree-view';
+import { SimpleTreeView } from '@mui/x-tree-view';

-import { TreeView } from '@mui/x-tree-view/TreeView';
+import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

   return (
-    <TreeView>
+    <SimpleTreeView>
       <TreeItem itemId="1" label="First item" />
-    </TreeView>
+    </SimpleTreeView>
   );

Copy
If you were using theme augmentation, you will also need to migrate it:

 const theme = createTheme({
   components: {
-    MuiTreeView: {
+    MuiSimpleTreeView: {
       styleOverrides: {
         root: {
           opacity: 0.5,
         },
       },
     },
   },
 });

Copy
If you were using the treeViewClasses object, you can replace it with the new simpleTreeViewClasses object:

 import { treeViewClasses } from '@mui/x-tree-view/TreeView';
 import { simpleTreeViewClasses } from '@mui/x-tree-view/SimpleTreeView';

-const rootClass = treeViewClasses.root;
+const rootClass = simpleTreeViewClasses.root;

Copy
Use slots to define the item icons

Define
expandIcon
The icon used to expand the children of an item (rendered when this item is collapsed) is now defined as a slot both on the <TreeView /> and the <TreeItem /> components.

If you were using the ChevronRight icon from @mui/icons-material, you can stop passing it to your component because it is now the default value:

-import ChevronRightIcon from '@mui/icons-material/ChevronRight';

 <SimpleTreeView
-  defaultExpandIcon={<ChevronRightIcon />}
 >
   {items}
 </SimpleTreeView>

Copy
If you were passing another icon to your Tree View component, you need to use the new expandIcon slot on this component:

 <SimpleTreeView
-  defaultExpandIcon={<MyCustomExpandIcon />}
+  slots={{ expandIcon: MyCustomExpandIcon }}
 >
   {items}
 </SimpleTreeView>

Copy
Note that the slots prop expects a React component, not the JSX element returned when rendering this component.

If you were passing another icon to your <TreeItem /> component, you need to use the new expandIcon slot on this component:

  <SimpleTreeView>
    <TreeItem
      itemId="1"
      label="Item 1"
-     expandIcon={<MyCustomExpandIcon />}
+     slots={{ expandIcon: MyCustomExpandIcon }}
    />
  </SimpleTreeView>

Copy
Define
collapseIcon
The icon used to collapse the children of an item (rendered when this item is expanded) is now defined as a slot both on the <TreeView /> and <TreeItem /> components.

If you were using the ExpandMore icon from @mui/icons-material, you can stop passing it to your component because it is now the default value:

- import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

  <SimpleTreeView
-   defaultCollapseIcon={<ExpandMoreIcon />}
  >
    {items}
  </SimpleTreeView>

Copy
If you were passing another icon to your Tree View component, you need to use the new collapseIcon slot on this component:

  <SimpleTreeView
-   defaultCollapseIcon={<MyCustomCollapseIcon />}
+   slots={{ collapseIcon: MyCustomCollapseIcon }}
  >
    {items}
  </SimpleTreeView>

Copy
Note that the slots prop expects a React component, not the JSX element returned when rendering this component.

If you were passing another icon to your <TreeItem /> component, you need to use the new collapseIcon slot on this component:

  <SimpleTreeView>
    <TreeItem
      itemId="1"
      label="Item 1"
-     collapseIcon={<MyCustomCollapseIcon />}
+     slots={{ collapseIcon: MyCustomCollapseIcon }}
    />
  </SimpleTreeView>

Copy
Replace
parentIcon
The parentIcon prop has been removed from the Tree View components.

If you were passing an icon to your Tree View component, you can achieve the same behavior by passing the same icon to both the collapseIcon and the expandIcon slots on this component:

  <SimpleTreeView
-   defaultParentIcon={<MyCustomParentIcon />}
+   slots={{ collapseIcon: MyCustomParentIcon, expandIcon: MyCustomParentIcon }}
  >
    {items}
  </SimpleTreeView>

Copy
Define
endIcon
The icon rendered next to an item without children is now defined as a slot both on the <TreeView /> and <TreeItem /> components.

If you were passing an icon to your Tree View component, you need to use the new endIcon slot on this component:

  <SimpleTreeView
-   defaultEndIcon={<MyCustomEndIcon />}
+   slots={{ endIcon: MyCustomEndIcon }}
  >
    {items}
  </SimpleTreeView>

Copy
Note that the slots prop expects a React component, not the JSX element returned when rendering this component.

If you were passing an icon to your <TreeItem /> component, you need to use the new endIcon slot on this component:

  <SimpleTreeView>
    <TreeItem
      itemId="1"
      label="Item 1"
-     endIcon={<MyCustomEndIcon />}
+     slots={{ endIcon: MyCustomEndIcon }}
    />
  </SimpleTreeView>

Copy
Define
icon
The icon rendered next to an item is now defined as a slot on the <TreeItem /> component.

If you were passing an icon to your <TreeItem /> component, you need to use the new icon slot on this component:

  <SimpleTreeView>
    <TreeItem
      itemId="1"
      label="Item 1"
-     icon={<MyCustomIcon />}
+     slots={{ icon: MyCustomIcon }}
    />
  </SimpleTreeView>

Copy
Note that the slots prop expects a React component, not the JSX element returned when rendering this component.

✅ Use slots to define the group transition

The component used to animate the item children is now defined as a slot on the <TreeItem /> component.

If you were passing a TransitionComponent or TransitionProps to your <TreeItem /> component, you need to use the new groupTransition slot on this component:

 <SimpleTreeView>
   <TreeItem
     itemId="1"
     label="Item 1"
-    TransitionComponent={Fade}
-    TransitionProps={{ timeout: 600 }}
+    slots={{ groupTransition: Fade }}
+    slotProps={{ groupTransition: { timeout: 600 } }}
   />
 </SimpleTreeView>

Copy
Rename the group class of the Tree Item component

The group class of the <TreeItem /> component has been renamed to groupTransition to match with its new slot name.

 const StyledTreeItem = styled(TreeItem)({
-  [`& .${treeItemClasses.group}`]: {
+  [`& .${treeItemClasses.groupTransition}`]: {
    marginLeft: 20,
  },
 });

Copy
✅ Rename onNodeToggle, expanded and defaultExpanded

The expansion props have been renamed to better describe their behaviors:

Old name	New name
onNodeToggle	onExpandedItemsChange
expanded	expandedItems
defaultExpanded	defaultExpandedItems
 <TreeView
-  onNodeToggle={handleExpansionChange}
+  onExpandedItemsChange={handleExpansionChange}

-  expanded={expandedItems}
+  expandedItems={expandedItems}

-  defaultExpanded={defaultExpandedItems}
+  defaultExpandedItems={defaultExpandedItems}
 />

Copy
If you were using the onNodeToggle prop to react to the expansion or collapse of a specific item, you can use the new onItemExpansionToggle prop which is called whenever an item is expanded or collapsed with its id and expansion status

// It is also available on the deprecated Tree View component
<SimpleTreeView
  onItemExpansionToggle={(event, itemId, isExpanded) =>
    console.log(itemId, isExpanded)
  }
/>

Copy
✅ Rename onNodeSelect, selected, and defaultSelected

The selection props have been renamed to better describe their behaviors:

Old name	New name
onNodeSelect	onSelectedItemsChange
selected	selectedItems
defaultSelected	defaultSelectedItems
 <TreeView
-  onNodeSelect={handleSelectionChange}
+  onSelectedItemsChange={handleSelectionChange}

-  selected={selectedItems}
+  selectedItems={selectedItems}

-  defaultSelected={defaultSelectedItems}
+  defaultSelectedItems={defaultSelectedItems}
 />

Copy
If you were using the onNodeSelect prop to react to the selection or deselection of a specific item, you can use the new onItemSelectionToggle prop which is called whenever an item is selected or deselected with its id and selection status.

// It is also available on the deprecated `<TreeView />` component
<SimpleTreeView
  onItemSelectionToggle={(event, itemId, isSelected) =>
    console.log(itemId, isSelected)
  }
/>

Copy
Focus the Tree Item instead of the Tree View

The focus is now applied to the Tree Item root element instead of the Tree View root element.

This change will allow new features that require the focus to be on the Tree Item, like the drag and drop reordering of items. It also solves several issues with focus management, like the inability to scroll to the focused item when a lot of items are rendered.

This will mostly impact how you write tests to interact with the Tree View:

For example, if you were writing a test with react-testing-library, here is what the changes could look like:

 it('test example on first item', () => {
   const { getByRole } = render(
     <SimpleTreeView>
       <TreeItem itemId="one" id="one">One</TreeItem>
       <TreeItem itemId="two" id="two">Two</TreeItem>
    </SimpleTreeView>
   );

   // Set the focus to the item "One"
-  const tree = getByRole('tree');
+  const treeItem = getByRole('treeitem', { name: 'One' });
   act(() => {
-    tree.focus();
+    treeItem.focus();
   });
-  fireEvent.keyDown(tree, { key: 'ArrowDown' });
+  fireEvent.keyDown(treeItem, { key: 'ArrowDown' });

  // Check if the new focused item is "Two"
- expect(tree)to.have.attribute('aria-activedescendant', 'two');
+ expect(document.activeElement).to.have.attribute('id', 'two');
 })

Copy
✅ Use useTreeItemState instead of useTreeItem

The useTreeItem hook has been renamed useTreeItemState. This will help create a new headless version of the Tree Item component based on a future useTreeItem hook.

-import { TreeItem, useTreeItem } from '@mui/x-tree-view/TreeItem';
+import { TreeItem, useTreeItemState } from '@mui/x-tree-view/TreeItem';

 const CustomContent = React.forwardRef((props, ref) => {
-  const { disabled } = useTreeItem(props.itemId);
+  const { disabled } = useTreeItemState(props.itemId);

   // Render some UI
 });

 function App() {
   return (
     <SimpleTreeView>
       <TreeItem ContentComponent={CustomContent} />
     </SimpleTreeView>
   )
 }

Copy
✅ Rename onNodeFocus

The onNodeFocus callback has been renamed to onItemFocus for consistency:

 <SimpleTreeView
-  onNodeFocus={onNodeFocus}
+  onItemFocus={onItemFocus}
 />