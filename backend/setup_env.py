#!/usr/bin/env python3
"""
Environment setup script for the 3D Quote API
Helps switch between local and production configurations
"""

import os
import shutil
from pathlib import Path
import argparse

def setup_environment(env_type: str):
    """
    Setup environment configuration
    
    Args:
        env_type: 'local' or 'production'
    """
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    source_env = backend_dir / f".env.{env_type}"
    
    if not source_env.exists():
        print(f"Error: {source_env} does not exist")
        return False
    
    # Backup existing .env if it exists
    if env_file.exists():
        backup_file = backend_dir / ".env.backup"
        shutil.copy2(env_file, backup_file)
        print(f"Backed up existing .env to .env.backup")
    
    # Copy the appropriate environment file
    shutil.copy2(source_env, env_file)
    print(f"Environment configured for {env_type}")
    
    # Display current configuration
    print("\nCurrent configuration:")
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                print(f"  {line}")
    
    if env_type == "production":
        print("\n⚠️  IMPORTANT: For production with S3 storage, make sure to set:")
        print("   - S3_BUCKET_NAME")
        print("   - AWS_ACCESS_KEY_ID")
        print("   - AWS_SECRET_ACCESS_KEY")
        print("   Either in your .env file or as environment variables")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Setup environment configuration")
    parser.add_argument(
        "environment",
        choices=["local", "production"],
        help="Environment type to configure"
    )
    
    args = parser.parse_args()
    
    if setup_environment(args.environment):
        print(f"\n✅ Successfully configured for {args.environment} environment")
        print("\nTo start the server:")
        print("  python main.py")
        print("  or")
        print("  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    else:
        print(f"\n❌ Failed to configure {args.environment} environment")
        exit(1)

if __name__ == "__main__":
    main()