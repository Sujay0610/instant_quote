import trimesh
import numpy as np
from pathlib import Path
import tempfile
import os
from typing import Dict, Any, Optional
import time
from stl import mesh as stl_mesh

from models.response_models import GeometryAnalysis, BoundingBox

class GeometryParser:
    """
    Service for parsing and analyzing 3D geometry files
    """
    
    def __init__(self):
        self.supported_formats = {
            '.stl': self._parse_stl,
            '.obj': self._parse_obj,
            '.ply': self._parse_ply,
            # Note: STEP/IGES support requires pythonOCC which is complex to install
            # '.step': self._parse_step,
            # '.stp': self._parse_step,
            # '.iges': self._parse_iges,
            # '.igs': self._parse_iges,
        }
    
    async def analyze_file(self, file_path: str, filename: str) -> GeometryAnalysis:
        """
        Analyze a 3D file and return geometry information
        """
        start_time = time.time()
        
        file_extension = Path(filename).suffix.lower()
        
        if file_extension not in self.supported_formats:
            raise ValueError(f"Unsupported file format: {file_extension}")
        
        # Parse the file
        mesh_data = await self.supported_formats[file_extension](file_path)
        
        if mesh_data is None:
            raise ValueError("Failed to parse geometry from file")
        
        # Analyze geometry
        analysis = self._analyze_mesh(mesh_data)
        
        processing_time = time.time() - start_time
        print(f"Geometry analysis completed in {processing_time:.2f} seconds")
        
        return analysis
    
    async def _parse_stl(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Parse STL file using trimesh
        """
        try:
            mesh = trimesh.load_mesh(file_path)
            if isinstance(mesh, trimesh.Scene):
                # If it's a scene, get the first mesh
                mesh = list(mesh.geometry.values())[0]
            return mesh
        except Exception as e:
            print(f"Error parsing STL file: {e}")
            # Try with numpy-stl as fallback
            try:
                stl_data = stl_mesh.Mesh.from_file(file_path)
                vertices = stl_data.vectors.reshape(-1, 3)
                faces = np.arange(len(vertices)).reshape(-1, 3)
                return trimesh.Trimesh(vertices=vertices, faces=faces)
            except Exception as e2:
                print(f"Fallback STL parsing also failed: {e2}")
                return None
    
    async def _parse_obj(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Parse OBJ file using trimesh
        """
        try:
            mesh = trimesh.load_mesh(file_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = list(mesh.geometry.values())[0]
            return mesh
        except Exception as e:
            print(f"Error parsing OBJ file: {e}")
            return None
    
    async def _parse_ply(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Parse PLY file using trimesh
        """
        try:
            mesh = trimesh.load_mesh(file_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = list(mesh.geometry.values())[0]
            return mesh
        except Exception as e:
            print(f"Error parsing PLY file: {e}")
            return None
    
    def _analyze_mesh(self, mesh: trimesh.Trimesh) -> GeometryAnalysis:
        """
        Analyze mesh geometry and return structured data
        """
        try:
            # Check if mesh is valid and attempt to fix common issues
            try:
                # Try to access volume to check if mesh is valid
                _ = mesh.volume
            except:
                print("Mesh has issues, attempting to fix...")
                mesh.fix_normals()
                mesh.remove_duplicate_faces()
                mesh.remove_degenerate_faces()
            
            # Calculate volume (convert from mm³ to cm³)
            volume_mm3 = abs(mesh.volume) if mesh.is_volume else 0
            volume_cm3 = volume_mm3 / 1000  # mm³ to cm³
            
            # Calculate surface area (convert from mm² to cm²)
            surface_area_mm2 = mesh.area
            surface_area_cm2 = surface_area_mm2 / 100  # mm² to cm²
            
            # Get bounding box
            bounds = mesh.bounds
            min_bound = bounds[0]
            max_bound = bounds[1]
            
            bounding_box = BoundingBox(
                min_x=float(min_bound[0]),
                min_y=float(min_bound[1]),
                min_z=float(min_bound[2]),
                max_x=float(max_bound[0]),
                max_y=float(max_bound[1]),
                max_z=float(max_bound[2]),
                width=float(max_bound[0] - min_bound[0]),
                height=float(max_bound[1] - min_bound[1]),
                depth=float(max_bound[2] - min_bound[2])
            )
            
            # Check mesh properties
            is_watertight = mesh.is_watertight
            has_holes = not is_watertight
            
            # Get mesh statistics
            triangle_count = len(mesh.faces)
            vertex_count = len(mesh.vertices)
            
            return GeometryAnalysis(
                volume=round(volume_cm3, 4),
                surface_area=round(surface_area_cm2, 2),
                bounding_box=bounding_box,
                triangle_count=triangle_count,
                vertex_count=vertex_count,
                is_watertight=is_watertight,
                has_holes=has_holes,
                units="mm"
            )
            
        except Exception as e:
            print(f"Error analyzing mesh: {e}")
            # Return default analysis if something goes wrong
            return GeometryAnalysis(
                volume=0.0,
                surface_area=0.0,
                bounding_box=BoundingBox(
                    min_x=0, min_y=0, min_z=0,
                    max_x=0, max_y=0, max_z=0,
                    width=0, height=0, depth=0
                ),
                triangle_count=0,
                vertex_count=0,
                is_watertight=False,
                has_holes=True,
                units="mm"
            )
    
    def get_mesh_info(self, mesh: trimesh.Trimesh) -> Dict[str, Any]:
        """
        Get additional mesh information for debugging
        """
        return {
            "is_watertight": mesh.is_watertight,
            "is_winding_consistent": mesh.is_winding_consistent,
            "euler_number": mesh.euler_number,
            "face_count": len(mesh.faces),
            "vertex_count": len(mesh.vertices),
            "edge_count": len(mesh.edges),
            "volume": mesh.volume,
            "area": mesh.area,
            "bounds": mesh.bounds.tolist()
        }