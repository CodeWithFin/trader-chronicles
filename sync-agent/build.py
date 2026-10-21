# Trader Chronicles Sync Agent - Build Script
# Run this to build the executable

import os
import sys
import subprocess
import shutil
from pathlib import Path

def build():
    """Build the sync agent executable using PyInstaller."""
    project_root = Path(__file__).parent
    src_dir = project_root / 'sync-agent'
    dist_dir = project_root / 'public' / 'sync-agent'
    
    # Create dist directory
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # PyInstaller command
    cmd = [
        'pyinstaller',
        '--onefile',
        '--windowed',
        '--name', 'TraderChroniclesSync',
        '--icon', str(src_dir / 'icon.ico') if (src_dir / 'icon.ico').exists() else 'NONE',
        '--add-data', f'{src_dir}/.env.example{os.pathsep}.',
        '--hidden-import', 'MetaTrader5',
        '--hidden-import', 'PyQt6',
        '--hidden-import', 'requests',
        '--hidden-import', 'keyring',
        '--hidden-import', 'dotenv',
        '--collect-all', 'MetaTrader5',
        '--collect-all', 'PyQt6',
        str(src_dir / 'main.py')
    ]
    
    print("Building sync agent...")
    print(f"Command: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, cwd=project_root)
    
    if result.returncode == 0:
        # Copy executable to public/sync-agent for serving
        exe_name = 'TraderChroniclesSync.exe' if sys.platform == 'win32' else 'TraderChroniclesSync'
        src_exe = project_root / 'dist' / exe_name
        dst_exe = dist_dir / exe_name
        
        if src_exe.exists():
            shutil.copy2(src_exe, dst_exe)
            print(f"\n✓ Build successful!")
            print(f"Executable copied to: {dst_exe}")
        else:
            print(f"\n✗ Executable not found at {src_exe}")
    else:
        print("\n✗ Build failed!")
        sys.exit(1)

if __name__ == '__main__':
    build()