# Duplicate File Detection

This document explains the duplicate file detection system implemented in the 3D Quote API.

## Overview

The system prevents users from uploading the same file multiple times within a session (e.g., the same cart). This helps:
- Reduce storage usage
- Prevent processing the same file multiple times
- Improve user experience by detecting duplicates
- Maintain session-based file tracking

## How It Works

### File Hash Calculation
- Each uploaded file is processed using SHA256 hashing
- The hash is calculated from the file content, not the filename
- Identical files will always produce the same hash, regardless of filename

### Session-Based Tracking
- Files are tracked per session using a `session_id` parameter
- Each session maintains a set of file hashes
- Duplicate detection only applies within the same session
- Different sessions can upload the same file without conflict

## API Usage

### Upload with Duplicate Detection

```bash
POST /upload?session_id=your-session-id
Content-Type: multipart/form-data

# Form data:
file: [your-file.stl]
```

**Response for new file:**
```json
{
  "duplicate": false,
  "file_info": {
    "filename": "model.stl",
    "stored_filename": "20250105_123456_uuid.stl",
    "access_url": "/download/20250105_123456_uuid.stl",
    "size": 1024,
    "format": ".stl",
    "file_hash": "abc123..."
  },
  "geometry_analysis": { ... },
  "session_info": {
    "session_id": "your-session-id",
    "session_file_count": 1
  }
}
```

**Response for duplicate file:**
```json
{
  "duplicate": true,
  "message": "This file has already been uploaded in this session",
  "file_hash": "abc123...",
  "session_file_count": 1
}
```

### Session Management

#### Get Session Information
```bash
GET /session/{session_id}/info
```

Response:
```json
{
  "session_id": "your-session-id",
  "file_count": 3,
  "has_files": true
}
```

#### Clear Session
```bash
POST /session/clear?session_id=your-session-id
```

Response:
```json
{
  "success": true,
  "message": "Session your-session-id cleared successfully"
}
```

## Implementation Details

### Storage Service Changes

The `StorageService` class now includes:
- `_session_file_hashes`: Dictionary tracking file hashes per session
- `_calculate_file_hash()`: SHA256 hash calculation
- `is_duplicate_in_session()`: Check if file exists in session
- `add_file_to_session()`: Add file hash to session tracking
- `clear_session()`: Remove session data
- `get_session_file_count()`: Get number of unique files in session

### Upload Endpoint Changes

The `/upload` endpoint now:
1. Accepts optional `session_id` parameter
2. Calculates file hash before processing
3. Checks for duplicates if session_id provided
4. Returns early if duplicate detected
5. Includes file hash and session info in response

## Best Practices

### Frontend Integration

1. **Generate Session IDs**: Create unique session IDs for each cart/session
   ```javascript
   const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
   ```

2. **Handle Duplicate Responses**: Check the `duplicate` field in responses
   ```javascript
   if (response.duplicate) {
     alert('This file has already been uploaded!');
     return;
   }
   ```

3. **Clear Sessions**: Clear session data when starting new carts
   ```javascript
   await fetch(`/session/clear?session_id=${sessionId}`, { method: 'POST' });
   ```

4. **Track Session State**: Monitor session file count
   ```javascript
   const sessionInfo = await fetch(`/session/${sessionId}/info`).then(r => r.json());
   console.log(`Files in session: ${sessionInfo.file_count}`);
   ```

### Error Handling

- Always check response status codes
- Handle duplicate detection gracefully
- Provide clear user feedback
- Consider retry mechanisms for network errors

## Security Considerations

- Session IDs should be unpredictable
- File hashes are not sensitive but help with deduplication
- Session data is stored in memory and cleared on server restart
- No persistent session storage across server restarts

## Limitations

- Session data is stored in memory (not persistent)
- Server restart clears all session data
- No cross-session duplicate detection
- No file content validation beyond hash comparison

## Testing

Use the provided test script:
```bash
python test_upload.py
```

This script tests:
- First file upload (should succeed)
- Duplicate file upload (should be detected)
- Session information retrieval
- Session clearing