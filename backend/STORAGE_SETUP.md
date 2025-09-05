# Storage Configuration Guide

This guide explains how to configure file storage for the 3D Quote API, supporting both local and cloud (S3) storage options.

## Quick Setup

### For Local Development
```bash
# Setup local environment
python setup_env.py local

# Start the server
python main.py
```

### For Production
```bash
# Setup production environment
python setup_env.py production

# Set your S3 credentials (if using S3)
export S3_BUCKET_NAME="your-production-bucket"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Start the server
python main.py
```

## Storage Options

### Local Storage
- **Best for**: Development, testing, small deployments
- **Files stored**: In local `uploads/` directory
- **Auto-cleanup**: Files older than configured hours are automatically deleted
- **Backup**: Files persist until cleanup

### S3 Storage
- **Best for**: Production, scalable deployments
- **Files stored**: In AWS S3 bucket
- **Auto-cleanup**: Files are automatically deleted after configured hours
- **Backup**: Relies on S3 versioning/backup policies

## Configuration Files

### `.env.local`
```env
STORAGE_TYPE=local
LOCAL_UPLOAD_DIR=uploads
AUTO_DELETE_HOURS=24
DEBUG=true
LOG_LEVEL=DEBUG
```

### `.env.production`
```env
STORAGE_TYPE=s3
S3_BUCKET_NAME=your-production-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AUTO_DELETE_HOURS=48
DEBUG=false
LOG_LEVEL=INFO
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STORAGE_TYPE` | Storage backend (`local` or `s3`) | `local` | No |
| `LOCAL_UPLOAD_DIR` | Local storage directory | `uploads` | No |
| `AUTO_DELETE_HOURS` | Hours before auto-deletion | `24` | No |
| `S3_BUCKET_NAME` | S3 bucket name | - | Yes (for S3) |
| `S3_REGION` | AWS region | `us-east-1` | No |
| `AWS_ACCESS_KEY_ID` | AWS access key | - | Yes (for S3) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - | Yes (for S3) |

## API Changes

The upload endpoint now returns additional fields:

```json
{
  "file_info": {
    "filename": "model.stl",
    "stored_filename": "20240101_120000_uuid.stl",
    "access_url": "/download/20240101_120000_uuid.stl",
    "size": 1024,
    "format": ".stl"
  },
  "geometry_analysis": { ... }
}
```

## New Endpoints

### Storage Information
```
GET /storage/info
```
Returns current storage configuration.

### Manual Cleanup
```
POST /admin/cleanup
```
Manually trigger cleanup of old files.

## Installation Requirements

### For Local Storage
```bash
pip install -r requirements.txt
```

### For S3 Storage
```bash
pip install -r requirements.txt
# boto3 is included in requirements.txt
```

## File Lifecycle

1. **Upload**: Files are saved with unique names to prevent conflicts
2. **Processing**: Temporary files are created for geometry analysis
3. **Storage**: Original files are stored in configured backend
4. **Access**: Files can be downloaded via `/download/{filename}` endpoint
5. **Cleanup**: Files are automatically deleted after configured hours

## Security Considerations

### Local Storage
- Ensure upload directory has proper permissions
- Consider disk space limits
- Regular cleanup prevents disk filling

### S3 Storage
- Use IAM roles with minimal required permissions
- Enable S3 bucket versioning for backup
- Consider S3 lifecycle policies for additional cleanup
- Use presigned URLs for secure access

## Troubleshooting

### Common Issues

1. **Files not persisting**: Check storage configuration and permissions
2. **S3 upload fails**: Verify AWS credentials and bucket permissions
3. **Cleanup not working**: Check logs for cleanup task errors
4. **Download fails**: Ensure files exist and storage is properly configured

### Debugging

```bash
# Check storage configuration
curl http://localhost:8000/storage/info

# Manual cleanup
curl -X POST http://localhost:8000/admin/cleanup

# Check logs
tail -f logs/app.log
```

## Migration

### From Temporary to Persistent Storage
If upgrading from the previous temporary file system:

1. Backup any important files
2. Update configuration using `setup_env.py`
3. Restart the application
4. Test file upload and download

### Between Storage Types
To switch from local to S3 or vice versa:

1. Run `python setup_env.py <new_type>`
2. Set required environment variables
3. Restart the application
4. Existing files in old storage won't be automatically migrated