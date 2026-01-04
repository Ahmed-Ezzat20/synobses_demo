#!/usr/bin/env python3
"""
Utility script to check fairseq2 cache directory configuration.
Run with: modal run check_cache.py
"""
import modal
import os

# Configure fairseq2 cache directory
os.environ["FAIRSEQ2_CACHE_DIR"] = "/model/fairseq2_cache"

app = modal.App("check-cache")

image = modal.Image.debian_slim(python_version="3.11").uv_pip_install(
    "fairseq2==0.6.0"
)

model_cache = modal.Volume.from_name("omniasr-cache", create_if_missing=True)

@app.function(image=image, volumes={"/model": model_cache})
def check_cache_dir():
    """Check the configured cache directory for fairseq2"""
    from fairseq2.assets.dirs import StandardAssetDirectoryAccessor
    from fairseq2.file_system import FileSystem
    from fairseq2.utils.env import Environment
    import os
    
    print("=" * 60)
    print("Fairseq2 Cache Directory Configuration")
    print("=" * 60)
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    print(f"  FAIRSEQ2_CACHE_DIR: {os.getenv('FAIRSEQ2_CACHE_DIR', 'Not set')}")
    print(f"  XDG_CACHE_HOME: {os.getenv('XDG_CACHE_HOME', 'Not set')}")
    print(f"  HOME: {os.getenv('HOME', 'Not set')}")
    
    # Check fairseq2's resolved cache directory
    accessor = StandardAssetDirectoryAccessor(Environment(), FileSystem())
    cache_dir = accessor.get_cache_dir()
    
    print(f"\n📁 Resolved Cache Directory:")
    print(f"  {cache_dir}")
    
    # Check if directory exists and list contents
    print(f"\n🔍 Directory Status:")
    if os.path.exists(cache_dir):
        print(f"  ✅ Directory exists")
        
        # List contents
        try:
            contents = os.listdir(cache_dir)
            if contents:
                print(f"\n📦 Cached Assets ({len(contents)} items):")
                for item in sorted(contents):
                    item_path = os.path.join(cache_dir, item)
                    if os.path.isdir(item_path):
                        size = sum(
                            os.path.getsize(os.path.join(dirpath, filename))
                            for dirpath, dirnames, filenames in os.walk(item_path)
                            for filename in filenames
                        )
                        print(f"  📂 {item} ({size / (1024**3):.2f} GB)")
                    else:
                        size = os.path.getsize(item_path)
                        print(f"  📄 {item} ({size / (1024**2):.2f} MB)")
            else:
                print(f"  ⚠️  Directory is empty (no cached models yet)")
        except Exception as e:
            print(f"  ❌ Error listing contents: {e}")
    else:
        print(f"  ⚠️  Directory does not exist yet")
        print(f"  💡 It will be created on first model download")
    
    # Check Modal volume mount
    print(f"\n💾 Modal Volume Status:")
    if os.path.exists("/model"):
        print(f"  ✅ /model is mounted")
        try:
            contents = os.listdir("/model")
            print(f"  📦 Volume contents ({len(contents)} items):")
            for item in sorted(contents):
                print(f"    - {item}")
        except Exception as e:
            print(f"  ❌ Error listing /model: {e}")
    else:
        print(f"  ❌ /model is NOT mounted")
    
    print("\n" + "=" * 60)
    print("✅ Cache configuration check complete!")
    print("=" * 60)

@app.local_entrypoint()
def main():
    check_cache_dir.remote()
