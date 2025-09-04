from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class FileInfo(BaseModel):
    filename: str
    size: int
    format: str
    upload_time: Optional[str] = None

class BoundingBox(BaseModel):
    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float
    width: float
    height: float
    depth: float

class GeometryAnalysis(BaseModel):
    volume: float  # in cm³
    surface_area: float  # in cm²
    bounding_box: BoundingBox
    triangle_count: int
    vertex_count: int
    is_watertight: bool
    has_holes: bool
    units: str = "mm"
    
class MaterialInfo(BaseModel):
    id: str
    name: str
    description: str
    cost_per_cm3: float
    properties: Dict[str, Any]

class ProcessInfo(BaseModel):
    id: str
    name: str
    description: str
    multiplier: float
    min_layer_height: float
    max_build_volume: Dict[str, float]

class QuoteCalculation(BaseModel):
    material_cost: float
    process_cost: float
    setup_fee: float
    handling_fee: float
    subtotal: float
    total: float
    quantity: int
    currency: str = "USD"
    estimated_delivery_days: int = 7

class UploadResponse(BaseModel):
    file_info: FileInfo
    geometry_analysis: GeometryAnalysis
    converted_file_url: Optional[str] = None
    processing_time: float
    
class ErrorResponse(BaseModel):
    error: str
    detail: str
    code: int