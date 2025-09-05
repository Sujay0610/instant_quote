from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
from pathlib import Path
import tempfile
import shutil
from typing import Optional, Dict, Any
import io
import asyncio
import logging
from contextlib import asynccontextmanager

from services.geometry_parser import GeometryParser
from services.file_converter import FileConverter
from services.storage_service import storage_service
from models.response_models import GeometryAnalysis, FileInfo
from config.storage import storage_config

logger = logging.getLogger(__name__)

# Background task for cleaning up old files
async def cleanup_task():
    """Background task to clean up old files periodically"""
    while True:
        try:
            await storage_service.cleanup_old_files()
            # Run cleanup every hour
            await asyncio.sleep(3600)
        except Exception as e:
            print(f"Error in cleanup task: {e}")
            await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    cleanup_task_handle = asyncio.create_task(cleanup_task())
    print(f"Storage configured: {storage_config.storage_type.value}")
    if storage_config.is_local_storage():
        print(f"Local storage directory: {storage_config.local_upload_dir}")
        print(f"Auto-delete after: {storage_config.auto_delete_hours} hours")
    
    yield
    
    # Shutdown
    cleanup_task_handle.cancel()
    try:
        await cleanup_task_handle
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="3D Quote API",
    description="API for 3D model analysis and instant quoting",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
geometry_parser = GeometryParser()
file_converter = FileConverter()

# Storage is now handled by storage_service
# UPLOAD_DIR is maintained for backward compatibility with download endpoint
UPLOAD_DIR = storage_config.local_upload_dir if storage_config.is_local_storage() else Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "3D Quote API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/upload", response_model=Dict[str, Any])
async def upload_file(file: UploadFile = File(...), session_id: Optional[str] = None):
    """
    Upload and analyze a 3D model file with duplicate detection
    """
    try:
        # Validate file type
        allowed_extensions = {".stl", ".obj", ".step", ".stp", ".iges", ".igs", ".3mf"}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file_extension}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Check for duplicates and save file using storage service
        file_stream = io.BytesIO(content)
        
        if session_id:
            # Use duplicate detection if session_id is provided
            is_duplicate_hash, is_same_name_different_content, stored_filename, access_url, file_hash = await storage_service.save_file_with_duplicate_check(
                file_stream, file.filename, session_id
            )
            
            if is_duplicate_hash:
                raise HTTPException(
                    status_code=409,
                    detail="This file already exists in your cart"
                )
            
            if is_same_name_different_content:
                raise HTTPException(
                    status_code=409,
                    detail=f"A different file with the name '{file.filename}' is already in your cart. Please rename this file to add it."
                )
        else:
            # No session tracking, save normally
            stored_filename, access_url, file_hash = await storage_service.save_file(file_stream, file.filename)
        
        # Save uploaded file temporarily for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse geometry
            analysis = await geometry_parser.analyze_file(tmp_file_path, file.filename)
            
            # Convert file if needed for frontend display
            converted_file_path = None
            if file_extension in {".step", ".stp", ".iges", ".igs", ".3mf"}:
                converted_file_path = await file_converter.convert_to_stl(tmp_file_path)
            
            # Prepare response
            response_data = {
                "duplicate": False,
                "file_info": {
                    "filename": file.filename,
                    "stored_filename": stored_filename,
                    "access_url": access_url,
                    "size": file_size,
                    "format": file_extension,
                    "file_hash": file_hash,
                },
                "geometry_analysis": analysis,
                "converted_file_url": f"/download/{Path(converted_file_path).name}" if converted_file_path else None
            }
            
            # Add session info if session_id provided
            if session_id:
                response_data["session_info"] = {
                    "session_id": session_id,
                    "session_file_count": storage_service.get_session_file_count(session_id)
                }
            
            return response_data
            
        finally:
            # Clean up temporary processing file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except HTTPException:
        # Re-raise HTTP exceptions (like 409 for duplicates)
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    Download stored files
    """
    if storage_config.is_local_storage():
        file_path = await storage_service.get_file(filename)
        if not file_path or not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(file_path)
    else:
        # For S3 storage, redirect to the presigned URL
        # This is a simplified approach - in production you might want to
        # generate a new presigned URL or proxy the download
        raise HTTPException(status_code=501, detail="Direct download not implemented for S3 storage")

@app.post("/admin/cleanup")
async def manual_cleanup():
    """
    Manually trigger cleanup of old files (admin endpoint)
    """
    try:
        await storage_service.cleanup_old_files()
        return {"success": True, "message": "Cleanup completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@app.get("/storage/info")
async def storage_info():
    """
    Get storage configuration information
    """
    return {
        "storage_type": storage_config.storage_type.value,
        "auto_delete_hours": storage_config.auto_delete_hours,
        "local_directory": str(storage_config.local_upload_dir) if storage_config.is_local_storage() else None,
        "s3_bucket": storage_config.s3_bucket if storage_config.is_s3_storage() else None
    }

@app.post("/session/clear")
async def clear_session(session_id: str):
    """
    Clear session file tracking (e.g., when starting a new cart)
    """
    try:
        storage_service.clear_session(session_id)
        return {
            "success": True,
            "message": f"Session {session_id} cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing session: {str(e)}")

@app.get("/session/{session_id}/info")
async def get_session_info(session_id: str):
    """
    Get information about a session's uploaded files
    """
    try:
        file_count = storage_service.get_session_file_count(session_id)
        return {
            "session_id": session_id,
            "file_count": file_count,
            "has_files": file_count > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session info: {str(e)}")

@app.delete("/session/{session_id}/file/{filename}")
async def remove_file_from_cart(session_id: str, filename: str):
    """
    Remove a file from the cart (session)
    """
    try:
        success = await storage_service.remove_file_from_session(session_id, filename)
        if success:
            return {
                "success": True,
                "message": f"File '{filename}' removed from cart",
                "remaining_files": storage_service.get_session_file_count(session_id)
            }
        else:
            raise HTTPException(status_code=404, detail=f"File '{filename}' not found in cart")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing file {filename} from session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing file: {str(e)}")

@app.post("/quote")
async def calculate_quote(
    volume: float,
    surface_area: float,
    material: str,
    process: str,
    quantity: int = 1
):
    """
    Calculate quote based on geometry and material/process selection
    """
    try:
        # Simple pricing logic (to be expanded)
        material_costs = {
            "pla": 0.05,  # per cm³
            "abs": 0.07,
            "petg": 0.08,
            "nylon": 0.12,
            "resin": 0.15
        }
        
        process_multipliers = {
            "fdm": 1.0,
            "sla": 1.5,
            "dmls": 3.0,
            "mjf": 2.0
        }
        
        base_cost = volume * material_costs.get(material, 0.1)
        process_cost = base_cost * process_multipliers.get(process, 1.0)
        total_cost = process_cost * quantity
        
        # Add setup and handling fees
        setup_fee = 10.0
        handling_fee = 5.0
        
        final_cost = total_cost + setup_fee + handling_fee
        
        return {
            "material_cost": round(base_cost, 2),
            "process_cost": round(process_cost, 2),
            "setup_fee": setup_fee,
            "handling_fee": handling_fee,
            "subtotal": round(total_cost, 2),
            "total": round(final_cost, 2),
            "quantity": quantity,
            "currency": "USD"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating quote: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)