from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
from pathlib import Path
import tempfile
import shutil
from typing import Optional, Dict, Any

from services.geometry_parser import GeometryParser
from services.file_converter import FileConverter
from models.response_models import GeometryAnalysis, FileInfo

app = FastAPI(
    title="3D Quote API",
    description="API for 3D model analysis and instant quoting",
    version="1.0.0"
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

# Create upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "3D Quote API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/upload", response_model=Dict[str, Any])
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and analyze a 3D model file
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
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
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
                "file_info": {
                    "filename": file.filename,
                    "size": file.size,
                    "format": file_extension,
                },
                "geometry_analysis": analysis,
                "converted_file_url": f"/download/{Path(converted_file_path).name}" if converted_file_path else None
            }
            
            return response_data
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    Download converted files
    """
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

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