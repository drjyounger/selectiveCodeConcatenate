import os
import argparse
import tiktoken  # <-- 1) Import tiktoken
from datetime import datetime
from typing import List, Set, Dict

# Define standard directories as a global constant
STANDARD_DIRS = {
    'venv', '__pycache__', 'node_modules', 'lib', 'site-packages',
    'dist', 'build', 'env', '.git', '.idea', '.vscode', '.svn', 'vendor'
}

def estimate_tokens(text: str, model_name: str = 'gpt-3.5-turbo') -> int:
    """
    Estimate the number of tokens in the given text using the specified model's encoding.
    Adjust the model_name if you need a different model's tokenization.
    """
    try:
        encoding = tiktoken.encoding_for_model(model_name)
    except KeyError:
        # Fallback if model_name is not recognized by tiktoken
        encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    return len(tokens)

def is_text_file(filename: str) -> bool:
    # Explicitly include .cursorrules, because we need its contents
    if filename == ".cursorrules":
        return True

    # List of common text-based file extensions in codebases
    text_extensions = {
        '.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.yaml', '.yml',
        '.sh', '.bat', '.ps1', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
        '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx', '.vue', '.scala', '.kt', '.groovy',
        '.gradle', '.sql', '.gitignore', '.env', '.cfg', '.ini', '.toml', '.csv'
    }
    return os.path.splitext(filename)[1].lower() in text_extensions

def is_standard_library_file(filepath: str) -> bool:
    return any(std_dir.lower() in filepath.lower() for std_dir in STANDARD_DIRS)

def get_language_from_extension(filename: str) -> str:
    """Determine the programming language based on file extension for markdown formatting."""
    ext = os.path.splitext(filename)[1].lower()
    language_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.rb': 'ruby',
        '.php': 'php',
        '.go': 'go',
        '.rs': 'rust',
        '.sql': 'sql'
    }
    return language_map.get(ext, 'text')

def concatenate_files(source_folder: str, output_folder: str, output_filename: str) -> None:
    os.makedirs(output_folder, exist_ok=True)
    output_path = os.path.join(output_folder, f"{output_filename}.md")
    
    # Statistics tracking
    stats = {
        'processed_files': 0,
        'ignored_files': 0,
        'skipped_dirs': 0,
        'errors': 0
    }
    
    # Collect all valid files first for the table of contents
    included_files: List[str] = []
    
    print("Scanning files...")
    
    # First pass to collect files
    for foldername, subfolders, filenames in os.walk(source_folder):
        # Track skipped directories
        original_subfolder_count = len(subfolders)
        subfolders[:] = [d for d in subfolders if d.lower() not in STANDARD_DIRS]
        stats['skipped_dirs'] += original_subfolder_count - len(subfolders)
        
        for filename in filenames:
            file_path = os.path.join(foldername, filename)
            normalized_filename = filename.strip().lower()
            
            # Ignore package-lock.json or standard library directories
            if normalized_filename == 'package-lock.json' or is_standard_library_file(file_path):
                stats['ignored_files'] += 1
                continue
                
            # Include .cursorrules or other recognized text files
            if is_text_file(filename) and not is_standard_library_file(file_path):
                included_files.append(file_path)
                stats['processed_files'] += 1

    # Write the actual file
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # Write header with metadata
        outfile.write(f"# Codebase Snapshot\n\n")
        outfile.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outfile.write(f"Source: {os.path.abspath(source_folder)}\n\n")
        
        # Write table of contents
        outfile.write("## Table of Contents\n\n")
        for file_path in included_files:
            relative_path = os.path.relpath(file_path, source_folder)
            outfile.write(f"- {relative_path}\n")
        outfile.write("\n---\n\n")
        
        # Write file contents
        for file_path in included_files:
            relative_path = os.path.relpath(file_path, source_folder)
            language = get_language_from_extension(file_path)
            
            # Custom header if the file is .cursorrules
            if os.path.basename(file_path) == ".cursorrules":
                outfile.write(f"## File: {relative_path} (Cursorrules)\n\n")
                outfile.write("### This file describes the overall scope and intent of the codebase\n")
            else:
                outfile.write(f"## File: {relative_path}\n\n")
            
            outfile.write(f"```{language}\n")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as infile:
                    content = infile.read()
                    # Check if this is an .env file and mask the values
                    if file_path.endswith('.env'):
                        # Split by lines and mask the values
                        lines = content.split('\n')
                        masked_lines = []
                        for line in lines:
                            if '=' in line and not line.startswith('#'):
                                key, _ = line.split('=', 1)
                                masked_lines.append(f"{key}=X-X-X")
                            else:
                                masked_lines.append(line)
                        content = '\n'.join(masked_lines)
                    outfile.write(content)
            except UnicodeDecodeError:
                outfile.write("[Unable to read file: encoding error]\n")
                stats['errors'] += 1
            except Exception as e:
                outfile.write(f"[Error reading file: {str(e)}]\n")
                stats['errors'] += 1
            
            outfile.write("\n```\n\n")
            outfile.write("---\n\n")  # Separator between files
    
    # 2) Read the concatenated file and estimate tokens
    with open(output_path, 'r', encoding='utf-8') as final_md:
        full_text = final_md.read()
    total_tokens = estimate_tokens(full_text)  # <-- Get token count

    # Print summary
    print("\nProcess Complete!")
    print(f"📁 Files processed: {stats['processed_files']}")
    print(f"🚫 Files ignored: {stats['ignored_files']}")
    print(f"⏩ Directories skipped: {stats['skipped_dirs']}")
    print(f"⚠️  Errors encountered: {stats['errors']}")
    print(f"Total Tokens: {total_tokens:,}")  # format with commas

    print(f"\n📄 Output saved to: {output_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Concatenate code files into a single markdown file for AI analysis."
    )
    parser.add_argument(
        "source_folder",
        help="Path to the source folder containing the codebase"
    )
    
    args = parser.parse_args()
    
    # Get the folder name from the source path to use as the filename
    folder_name = os.path.basename(os.path.normpath(args.source_folder))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"{folder_name}_{timestamp}"
    
    # Create the output directory path as a subfolder of the source directory
    output_dir = os.path.join(args.source_folder, "Concatenated")
    
    concatenate_files(args.source_folder, output_dir, output_filename)

if __name__ == "__main__":
    main()
