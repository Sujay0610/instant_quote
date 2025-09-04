import trimesh
import tempfile
import os
from pathlib import Path
from typing import Optional, Dict, Any
import shutil

class FileConverter:
    """
    Service for converting between different 3D file formats
    """
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "3d_quote_conversions"
        self.temp_dir.mkdir(exist_ok=True)
        
        # Supported input formats for conversion
        self.convertible_formats = {
            '.step', '.stp', '.iges', '.igs', '.3mf', '.obj', '.ply'
        }
    
    async def convert_to_stl(self, input_file_path: str, output_dir: Optional[str] = None) -> Optional[str]:
        """
        Convert various 3D formats to STL for frontend display
        """
        try:
            input_path = Path(input_file_path)
            file_extension = input_path.suffix.lower()
            
            if output_dir is None:
                output_dir = self.temp_dir
            else:
                output_dir = Path(output_dir)
                output_dir.mkdir(exist_ok=True)
            
            output_filename = f"{input_path.stem}_converted.stl"
            output_path = output_dir / output_filename
            
            # Handle different input formats
            if file_extension in {'.step', '.stp'}:
                mesh = await self._convert_step_to_mesh(input_file_path)
            elif file_extension in {'.iges', '.igs'}:
                mesh = await self._convert_iges_to_mesh(input_file_path)
            elif file_extension == '.3mf':
                mesh = await self._convert_3mf_to_mesh(input_file_path)
            elif file_extension in {'.obj', '.ply'}:
                # These can be loaded directly by trimesh
                mesh = trimesh.load_mesh(input_file_path)
            else:
                raise ValueError(f"Unsupported format for conversion: {file_extension}")
            
            if mesh is None:
                raise ValueError("Failed to load mesh from input file")
            
            # Handle scene objects
            if isinstance(mesh, trimesh.Scene):
                # Combine all geometries in the scene
                meshes = [geom for geom in mesh.geometry.values() if isinstance(geom, trimesh.Trimesh)]
                if meshes:
                    mesh = trimesh.util.concatenate(meshes)
                else:
                    raise ValueError("No valid meshes found in scene")
            
            # Ensure we have a valid mesh
            if not isinstance(mesh, trimesh.Trimesh):
                raise ValueError("Converted object is not a valid mesh")
            
            # Clean up the mesh
            mesh.remove_duplicate_faces()
            mesh.remove_degenerate_faces()
            
            # Export to STL
            mesh.export(str(output_path))
            
            if output_path.exists():
                print(f"Successfully converted {input_path.name} to STL")
                return str(output_path)
            else:
                raise ValueError("STL file was not created")
                
        except Exception as e:
            print(f"Error converting file to STL: {e}")
            return None
    
    async def _convert_step_to_mesh(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Convert STEP file to mesh (requires pythonOCC or FreeCAD)
        For now, this is a placeholder that returns None
        """
        print("STEP conversion not implemented - requires pythonOCC-core")
        # TODO: Implement STEP conversion using pythonOCC-core
        # This requires complex installation and setup
        return None
    
    async def _convert_iges_to_mesh(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Convert IGES file to mesh (requires pythonOCC or FreeCAD)
        For now, this is a placeholder that returns None
        """
        print("IGES conversion not implemented - requires pythonOCC-core")
        # TODO: Implement IGES conversion using pythonOCC-core
        return None
    
    async def _convert_3mf_to_mesh(self, file_path: str) -> Optional[trimesh.Trimesh]:
        """
        Convert 3MF file to mesh
        """
        try:
            # Try to load with trimesh (it has some 3MF support)
            mesh = trimesh.load_mesh(file_path)
            return mesh
        except Exception as e:
            print(f"Error converting 3MF file: {e}")
            return None
    
    async def convert_to_obj(self, input_file_path: str, output_dir: Optional[str] = None) -> Optional[str]:
        """
        Convert various formats to OBJ
        """
        try:
            mesh = trimesh.load_mesh(input_file_path)
            
            if isinstance(mesh, trimesh.Scene):
                meshes = [geom for geom in mesh.geometry.values() if isinstance(geom, trimesh.Trimesh)]
                if meshes:
                    mesh = trimesh.util.concatenate(meshes)
                else:
                    return None
            
            if output_dir is None:
                output_dir = self.temp_dir
            else:
                output_dir = Path(output_dir)
                output_dir.mkdir(exist_ok=True)
            
            input_path = Path(input_file_path)
            output_filename = f"{input_path.stem}_converted.obj"
            output_path = output_dir / output_filename
            
            mesh.export(str(output_path))
            
            if output_path.exists():
                return str(output_path)
            else:
                return None
                
        except Exception as e:
            print(f"Error converting to OBJ: {e}")
            return None
    
    def cleanup_temp_files(self, max_age_hours: int = 24):
        """
        Clean up temporary conversion files older than specified hours
        """
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for file_path in self.temp_dir.glob("*"):
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        file_path.unlink()
                        print(f"Cleaned up old temp file: {file_path.name}")
                        
        except Exception as e:
            print(f"Error cleaning up temp files: {e}")
    
    def get_supported_formats(self) -> Dict[str, str]:
        """
        Get list of supported input formats for conversion
        """
        return {
            '.stl': 'STL (STereoLithography)',
            '.obj': 'Wavefront OBJ',
            '.ply': 'Stanford PLY',
            '.3mf': '3D Manufacturing Format',
            '.step': 'STEP (Standard for Exchange of Product Data)',
            '.stp': 'STEP (Standard for Exchange of Product Data)',
            '.iges': 'IGES (Initial Graphics Exchange Specification)',
            '.igs': 'IGES (Initial Graphics Exchange Specification)'
        }