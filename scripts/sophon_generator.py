import os
import hashlib
import json
import shutil
import pyzstd
from pathlib import Path

def get_md5(data):
    return hashlib.md5(data).hexdigest()

def generate_mock_sophon(source_dir, output_dir):
    source_path = Path(source_dir)
    out_path = Path(output_dir)
    
    manifest_dir = out_path / "manifests"
    chunk_dir = out_path / "chunks"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    chunk_dir.mkdir(parents=True, exist_ok=True)

    manifest_files = []
    CHUNK_SIZE = 1024 * 1024 # 1MB

    for root, _, files in os.walk(source_dir):
        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(source_path)
            
            file_size = file_path.stat().st_size
            file_md5 = hashlib.md5(open(file_path, "rb").read()).hexdigest()
            
            chunks = []
            with open(file_path, "rb") as f:
                offset = 0
                while True:
                    decompressed_data = f.read(CHUNK_SIZE)
                    if not decompressed_data:
                        break
                    
                    d_size = len(decompressed_data)
                    d_md5 = get_md5(decompressed_data)
                    
                    # Compress chunk using pyzstd
                    compressed_data = pyzstd.compress(decompressed_data)
                    c_size = len(compressed_data)
                    c_md5 = get_md5(compressed_data)
                    c_name = f"{c_md5}"
                    
                    # Save compressed chunk to disk
                    with open(chunk_dir / c_name, "wb") as cf:
                        cf.write(compressed_data)
                    
                    chunks.append({
                        "chunk_id": d_md5, # Use decompressed MD5 for identification
                        "chunk_decompressed_md5": d_md5,
                        "chunk_name": c_name, # Still use compressed MD5 for the filename
                        "offset": offset,
                        "size": d_size, # Use decompressed size for the primary size field
                        "chunk_compressed_size": c_size,
                        "chunk_decompressed_size": d_size
                    })
                    offset += d_size
            
            manifest_files.append({
                "name": str(rel_path),
                "size": file_size,
                "md5": file_md5,
                "chunks": chunks
            })

    # Update manifest to include both fields as expected by our new Rust parser
    manifest = {
        "manifest_id": "mock_manifest_id",
        "game_id": "genshin",
        "version": "6.3.0_MOCK",
        "categories": [
            {
                "id": "1",
                "name": "Game Core",
                "size": sum(f["size"] for f in manifest_files),
                "is_required": True
            }
        ],
        "files": manifest_files,
        "stats": {
            "total_size": sum(f["size"] for f in manifest_files),
            "chunk_count": sum(len(f["chunks"]) for f in manifest_files),
            "file_count": len(manifest_files)
        },
        "diff_packages": []
    }
    
    with open(manifest_dir / "mock_manifest_id", "w") as f:
        json.dump(manifest, f)
        
    print(f"Generated compressed mock Sophon assets in {output_dir}")

if __name__ == "__main__":
    # Create a mini fixture from fake_game
    generate_mock_sophon("./fixtures/fake_game", "./fixtures/sophon_mock")
