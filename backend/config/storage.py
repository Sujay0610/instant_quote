import os
from pathlib import Path
from typing import Optional
from enum import Enum

class StorageType(Enum):
    LOCAL = "local"
    S3 = "s3"

class StorageConfig:
    def __init__(self):
        self.storage_type = StorageType(os.getenv("STORAGE_TYPE", "local"))
        
        # Local storage configuration
        self.local_upload_dir = Path(os.getenv("LOCAL_UPLOAD_DIR", "uploads"))
        self.auto_delete_hours = int(os.getenv("AUTO_DELETE_HOURS", "24"))
        
        # S3 configuration (for production)
        self.s3_bucket_name = os.getenv("S3_BUCKET_NAME")
        self.s3_region = os.getenv("S3_REGION", "us-east-1")
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        # Ensure local directory exists
        if self.storage_type == StorageType.LOCAL:
            self.local_upload_dir.mkdir(exist_ok=True)
    
    def is_local_storage(self) -> bool:
        return self.storage_type == StorageType.LOCAL
    
    def is_s3_storage(self) -> bool:
        return self.storage_type == StorageType.S3
    
    def validate_s3_config(self) -> bool:
        """Validate that all required S3 configuration is present"""
        if self.storage_type == StorageType.S3:
            return all([
                self.s3_bucket_name,
                self.aws_access_key_id,
                self.aws_secret_access_key
            ])
        return True

# Global storage configuration instance
storage_config = StorageConfig()