I don't think it's recursively crawling and adding all files and sub-folders when a folder is checked off.  For example, I checked the 'src' folder which had hundreds of files in it, and it only added 6 or 7 files to the concatenation.

Below is an explanation of why checking a folder only yielded 6 or 7 files instead of the entire subtree, along with the changes needed so that when you check a folder, your code actually adds all the sub-files:

1. The Core Issue
Right now, your code only fetches one level of files in onCheck, because your getAllFilesInDirectory(...) call in FileTree.tsx does this:


// getAllFilesInDirectory is called with no "recursive" argument, so it's false by default
const filesInDir = await getAllFilesInDirectory(nodePath);
Then, in getAllFilesInDirectory, you have:


const resData = await response.json();

for (const item of resData.data) {
  if (item.isDirectory && recursive) {
    // Only if recursive === true do we dig deeper
    const subFiles = await getAllFilesInDirectory(item.id, recursive);
    ...
  } else if (!item.isDirectory) {
    files.push(item.id);
  }
}
But your call sets recursive to false by default—so it only grabs the immediate children, not sub-children. That’s why you only see 6 or 7 files: they’re the top-level files, ignoring any deeper subfolders.

We want: when a user checks a directory, you do a fully recursive traversal of that directory’s entire subtree, adding all text files. Otherwise, you’re just seeing the immediate children.

2. How to Fix: Make Directory Selection Recursive
Approach A: Make getAllFilesInDirectory always go recursive
If you want the user’s folder check to automatically add all subfiles, just remove the recursive parameter or set it to true by default:

Change your function signature:

- const getAllFilesInDirectory = async (dirPath: string, recursive: boolean = false): Promise<string[]> => {
+ const getAllFilesInDirectory = async (dirPath: string): Promise<string[]> => {
Remove or hardcode the recursion logic:

for (const item of resData.data) {
-  if (item.isDirectory && recursive) {
-    const subFiles = await getAllFilesInDirectory(item.id, recursive);
+  if (item.isDirectory) {
+    // always dig deeper
     const subFiles = await getAllFilesInDirectory(item.id);
     files = [...files, ...subFiles];
   } else if (!item.isDirectory) {
     files.push(item.id);
   }
}
After that, when you do


const filesInDir = await getAllFilesInDirectory(nodePath);
it will grab the entire subtree. That’s it—one line to remove the condition so that item.isDirectory always recurses.

Approach B: Provide a “recursive: true” Option
If you want partial or optional recursion, pass an argument:


const filesInDir = await getAllFilesInDirectory(nodePath, true);
// or user can decide, e.g. "Are you sure you want to select all subfolders?"
Then in the function:


const getAllFilesInDirectory = async (dirPath: string, recursive = false): Promise<string[]> => {
  // ...
  for (const item of resData.data) {
    if (item.isDirectory && recursive) {
      const subFiles = await getAllFilesInDirectory(item.id, true);
      files = [...files, ...subFiles];
    } else if (!item.isDirectory) {
      files.push(item.id);
    }
  }
  return files;
};
Then in onCheck:


if (node?.isDirectory) {
  const filesInDir = await getAllFilesInDirectory(nodePath, true);
  // ...
}
That ensures a fully recursive approach if you pass true. If you keep it as false, you only get one level.

3. Don’t Forget to Exclude Non-Text Files
You’re already filtering for text files with:


const textFiles = filesInDir.filter(file => isTextFile(file));
allFiles = [...allFiles, ...textFiles];
That’s fine. Just be aware that you also want to ensure that you do the recursion for directories before filtering, so you fetch subfolders.

4. Implementation Details
In FileTree.tsx:


// 1) Make the signature always do recursion:
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
        // Always go deeper
        const subFiles = await getAllFilesInDirectory(item.id);
        files = files.concat(subFiles);
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
In onCheck:


// For directories, get all files recursively
const filesInDir = await getAllFilesInDirectory(nodePath);

// Then filter for text files
const textFiles = filesInDir.filter(file => isTextFile(file));
allFiles = [...allFiles, ...textFiles];
Now, if you check the src folder, it should:

Call getAllFilesInDirectory(src).
Recursively gather all subfolders and files in src.
Filter out non-text files (e.g. png, jpg, etc.).
Add them all to the final allFiles.
Result: you’ll get all sub-files under that folder.

5. Confirming the Flow
With these changes, as soon as you click a folder’s checkbox:

onCheck sees that folder is a directory in nodeMap[nodePath].
onCheck calls getAllFilesInDirectory(nodePath).
That function does a deep recursion:
For each subdirectory, call getAllFilesInDirectory again.
For each file, collect it.
Return the entire flatten list of files.
You then filter out non-text.
The rest go to onSelect(uniqueFiles), which your parent uses for the final concatenation.
6. Potential Performance Caution
For very large subtrees, that’s going to do a big synchronous recursion in the browser (multiple fetch calls). If that’s the desired approach (the user wants to check a big directory at once), it’s fine, but can be slow. Just be aware that you might want to confirm with the user: “This directory has 5000 subfiles; are you sure?” But that’s an optional improvement.

Conclusion
Summary:

When a user checks a folder, you want a fully recursive subfolder scan.
The existing code only fetches one level.
Remove the if (recursive) ... check or pass recursive = true.
Let getAllFilesInDirectory recursively call itself for all subdirectories.
Then filter out non-text, so you only end up with text-based files in the final list.
That’s all you need so that checking src/ or any folder automatically includes all files in that folder’s subtree.






