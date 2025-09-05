import os
import asyncio
import shutil
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, BinaryIO, Dict, Set
from uuid import uuid4
import aiofiles
import logging

try:
    import boto3
    from botocore.exceptions import ClientError
    S3_AVAILABLE = True
except ImportError:
    S3_AVAILABLE = False
    boto3 = None
    ClientError = Exception

from config.storage import storage_config, StorageType

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.config = storage_config
        self._s3_client = None
        # Track file hashes per session to detect duplicates
        self._session_file_hashes: Dict[str, Set[str]] = {}
        # Track filename-hash mapping per session to handle same name different content
        self._session_filename_hashes: Dict[str, Dict[str, str]] = {}
        
        if self.config.is_s3_storage():
            if not S3_AVAILABLE:
                raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
            if not self.config.validate_s3_config():
                raise ValueError("Invalid S3 configuration. Check environment variables.")
            self._init_s3_client()
    
    def _init_s3_client(self):
        """Initialize S3 client"""
        self._s3_client = boto3.client(
            's3',
            region_name=self.config.s3_region,
            aws_access_key_id=self.config.aws_access_key_id,
            aws_secret_access_key=self.config.aws_secret_access_key
        )
    
    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename to avoid conflicts"""
        file_extension = Path(original_filename).suffix
        unique_id = str(uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{timestamp}_{unique_id}{file_extension}"
    
    def _calculate_file_hash(self, file_content: BinaryIO) -> str:
        """Calculate SHA256 hash of file content"""
        file_content.seek(0)
        hash_sha256 = hashlib.sha256()
        for chunk in iter(lambda: file_content.read(4096), b""):
            hash_sha256.update(chunk)
        file_content.seek(0)  # Reset position for later use
        return hash_sha256.hexdigest()
    
    def is_duplicate_in_session(self, session_id: str, file_hash: str, filename: str) -> tuple[bool, bool]:
        """Check if file hash already exists in the current session
        Returns: (is_duplicate_hash, is_same_name_different_content)
        """
        if session_id not in self._session_file_hashes:
            return False, False
        
        # Check if exact same file (same hash) exists
        is_duplicate_hash = file_hash in self._session_file_hashes[session_id]
        
        # Check if same filename with different content exists
        is_same_name_different_content = False
        if session_id in self._session_filename_hashes:
            existing_hash = self._session_filename_hashes[session_id].get(filename)
            if existing_hash and existing_hash != file_hash:
                is_same_name_different_content = True
        
        return is_duplicate_hash, is_same_name_different_content
    
    def add_file_to_session(self, session_id: str, file_hash: str, filename: str) -> None:
        """Add file hash and filename to session tracking"""
        if session_id not in self._session_file_hashes:
            self._session_file_hashes[session_id] = set()
        if session_id not in self._session_filename_hashes:
            self._session_filename_hashes[session_id] = {}
        
        self._session_file_hashes[session_id].add(file_hash)
        self._session_filename_hashes[session_id][filename] = file_hash
    
    def clear_session(self, session_id: str) -> None:
        """Clear session file tracking"""
        if session_id in self._session_file_hashes:
            del self._session_file_hashes[session_id]
        if session_id in self._session_filename_hashes:
            del self._session_filename_hashes[session_id]
    
    def get_session_file_count(self, session_id: str) -> int:
        """Get number of unique files uploaded in session"""
        if session_id not in self._session_file_hashes:
            return 0
        return len(self._session_file_hashes[session_id])
    
    async def remove_file_from_session(self, session_id: str, filename: str) -> bool:
        """Remove a file from session tracking and delete the physical file"""
        if session_id not in self._session_filename_hashes:
            return False
        
        # Get the file hash for this filename
        file_hash = self._session_filename_hashes[session_id].get(filename)
        if not file_hash:
            return False
        
        # Remove from session tracking
        if session_id in self._session_file_hashes:
            self._session_file_hashes[session_id].discard(file_hash)
        
        if session_id in self._session_filename_hashes:
            del self._session_filename_hashes[session_id][filename]
        
        # TODO: Optionally delete the physical file from storage
        # For now, we just remove from session tracking
        
        return True
    
    async def save_file(self, file_content: BinaryIO, original_filename: str, session_id: Optional[str] = None) -> tuple[str, str, str]:
        """
        Save file to configured storage
        Returns: (stored_filename, access_url, file_hash)
        """
        # Calculate file hash for duplicate detection
        file_hash = self._calculate_file_hash(file_content)
        
        unique_filename = self._generate_unique_filename(original_filename)
        
        if self.config.is_local_storage():
            stored_filename, access_url = await self._save_local(file_content, unique_filename)
        else:
            stored_filename, access_url = await self._save_s3(file_content, unique_filename)
        
        # Track file in session if session_id provided
        if session_id:
            self.add_file_to_session(session_id, file_hash, original_filename)
        
        return stored_filename, access_url, file_hash
    
    async def save_file_with_duplicate_check(self, file_content: BinaryIO, original_filename: str, session_id: str) -> tuple[bool, bool, Optional[str], Optional[str], str]:
        """
        Save file with duplicate detection
        Returns: (is_duplicate_hash, is_same_name_different_content, stored_filename, access_url, file_hash)
        """
        # Calculate file hash
        file_hash = self._calculate_file_hash(file_content)
        
        # Check if this file already exists in the session
        is_duplicate_hash, is_same_name_different_content = self.is_duplicate_in_session(session_id, file_hash, original_filename)
        
        if is_duplicate_hash:
            return True, False, None, None, file_hash
        
        if is_same_name_different_content:
            return False, True, None, None, file_hash
        
        # File is not a duplicate, save it
        stored_filename, access_url, _ = await self.save_file(file_content, original_filename, session_id)
        
        return False, False, stored_filename, access_url, file_hash
    
    async def _save_local(self, file_content: BinaryIO, filename: str) -> tuple[str, str]:
        """Save file to local storage"""
        file_path = self.config.local_upload_dir / filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            file_content.seek(0)
            await f.write(file_content.read())
        
        # Create metadata file for cleanup
        metadata_path = self.config.local_upload_dir / f"{filename}.meta"
        metadata = {
            "upload_time": datetime.now().isoformat(),
            "original_filename": filename
        }
        
        async with aiofiles.open(metadata_path, 'w') as f:
            import json
            await f.write(json.dumps(metadata))
        
        access_url = f"/download/{filename}"
        return filename, access_url
    
    async def _save_s3(self, file_content: BinaryIO, filename: str) -> tuple[str, str]:
        """Save file to S3 storage"""
        try:
            file_content.seek(0)
            
            # Upload to S3
            self._s3_client.upload_fileobj(
                file_content,
                self.config.s3_bucket_name,
                filename,
                ExtraArgs={
                    'Metadata': {
                        'upload_time': datetime.now().isoformat(),
                        'auto_delete_hours': str(self.config.auto_delete_hours)
                    }
                }
            )
            
            # Generate presigned URL for access
            access_url = self._s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.config.s3_bucket_name, 'Key': filename},
                ExpiresIn=self.config.auto_delete_hours * 3600  # Convert hours to seconds
            )
            
            return filename, access_url
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise Exception(f"Failed to upload file to S3: {e}")
    
    async def get_file(self, filename: str) -> Optional[Path]:
        """Get file path for local storage or download from S3"""
        if self.config.is_local_storage():
            file_path = self.config.local_upload_dir / filename
            return file_path if file_path.exists() else None
        else:
            # For S3, we would need to download the file temporarily
            # This is a simplified implementation
            return None
    
    async def delete_file(self, filename: str) -> bool:
        """Delete file from storage"""
        if self.config.is_local_storage():
            return await self._delete_local(filename)
        else:
            return await self._delete_s3(filename)
    
    async def _delete_local(self, filename: str) -> bool:
        """Delete file from local storage"""
        try:
            file_path = self.config.local_upload_dir / filename
            metadata_path = self.config.local_upload_dir / f"{filename}.meta"
            
            if file_path.exists():
                file_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete local file {filename}: {e}")
            return False
    
    async def _delete_s3(self, filename: str) -> bool:
        """Delete file from S3 storage"""
        try:
            self._s3_client.delete_object(
                Bucket=self.config.s3_bucket_name,
                Key=filename
            )
            return True
        except ClientError as e:
            logger.error(f"Failed to delete S3 file {filename}: {e}")
            return False
    
    async def cleanup_old_files(self):
        """Clean up files older than configured hours"""
        if self.config.is_local_storage():
            await self._cleanup_local_files()
        else:
            await self._cleanup_s3_files()
    
    async def _cleanup_local_files(self):
        """Clean up old local files"""
        cutoff_time = datetime.now() - timedelta(hours=self.config.auto_delete_hours)
        
        for metadata_file in self.config.local_upload_dir.glob("*.meta"):
            try:
                async with aiofiles.open(metadata_file, 'r') as f:
                    import json
                    metadata = json.loads(await f.read())
                
                upload_time = datetime.fromisoformat(metadata['upload_time'])
                
                if upload_time < cutoff_time:
                    # Delete both the file and metadata
                    filename = metadata_file.stem  # Remove .meta extension
                    await self._delete_local(filename)
                    logger.info(f"Cleaned up old file: {filename}")
                    
            except Exception as e:
                logger.error(f"Error cleaning up {metadata_file}: {e}")
    
    async def _cleanup_s3_files(self):
        """Clean up old S3 files"""
        try:
            response = self._s3_client.list_objects_v2(Bucket=self.config.s3_bucket_name)
            cutoff_time = datetime.now() - timedelta(hours=self.config.auto_delete_hours)
            
            for obj in response.get('Contents', []):
                # Get object metadata
                head_response = self._s3_client.head_object(
                    Bucket=self.config.s3_bucket_name,
                    Key=obj['Key']
                )
                
                upload_time_str = head_response.get('Metadata', {}).get('upload_time')
                if upload_time_str:
                    upload_time = datetime.fromisoformat(upload_time_str)
                    
                    if upload_time < cutoff_time:
                        await self._delete_s3(obj['Key'])
                        logger.info(f"Cleaned up old S3 file: {obj['Key']}")
                        
        except ClientError as e:
            logger.error(f"Error cleaning up S3 files: {e}")

# Global storage service instance
storage_service = StorageService()