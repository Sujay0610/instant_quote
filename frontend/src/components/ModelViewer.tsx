'use client';

import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import { RotateCcw, ZoomIn, ZoomOut, Move3D, Eye } from 'lucide-react';

interface ModelViewerProps {
  modelData: {
    url: string;
    file: File;
  } | null;
}

function Model({ url, fileExtension }: { url: string; fileExtension: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  // Load different file types
  React.useEffect(() => {
    const loadModel = async () => {
      try {
        let loader;
        if (fileExtension === 'stl') {
          loader = new STLLoader();
        } else if (fileExtension === 'obj') {
          loader = new OBJLoader();
        } else {
          // For other formats, we'll need backend conversion
          console.warn('Unsupported format for direct loading:', fileExtension);
          return;
        }

        const result = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });

        if (fileExtension === 'stl') {
          setGeometry(result as THREE.BufferGeometry);
        } else if (fileExtension === 'obj') {
          // OBJ loader returns a Group
          const group = result as THREE.Group;
          const mesh = group.children[0] as THREE.Mesh;
          if (mesh && mesh.geometry) {
            setGeometry(mesh.geometry);
          }
        }
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };

    loadModel();
  }, [url, fileExtension]);

  // Center and scale the model - ALWAYS call this hook
  React.useEffect(() => {
    if (geometry && meshRef.current) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Center the geometry
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Scale to fit in view
      const scale = 2 / maxDim;
      meshRef.current.scale.setScalar(scale);
      
      // Rotate the model 90 degrees around X-axis
      meshRef.current.rotation.x = Math.PI / 2;
    }
  }, [geometry]);

  // Return null AFTER all hooks have been called
  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color="#8B9DC3" 
        metalness={0.1} 
        roughness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function LoadingSpinner() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3B82F6" wireframe />
    </mesh>
  );
}

export default function ModelViewer({ modelData }: ModelViewerProps) {
  const [viewMode, setViewMode] = useState<'perspective' | 'orthographic'>('perspective');
  const controlsRef = useRef<any>(null);

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-[400px] relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={resetView}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 p-2 rounded-md hover:bg-gray-50 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode(viewMode === 'perspective' ? 'orthographic' : 'perspective')}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 p-2 rounded-md hover:bg-gray-50 transition-colors"
          title="Toggle Camera"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* File Info */}
      {modelData && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md p-3">
          <div className="text-sm">
            <p className="font-medium text-gray-900">{modelData.file.name}</p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas className="w-full h-full">
        <PerspectiveCamera makeDefault position={[2.5, 2.5, 2.5]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        {/* Environment */}
        <Environment preset="studio" />
        
        {/* Grid */}
        <Grid 
          args={[20, 20]} 
          cellSize={0.5} 
          cellThickness={0.5} 
          cellColor="#6B7280" 
          sectionSize={2} 
          sectionThickness={1} 
          sectionColor="#374151"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
        
        {/* Model */}
        <Suspense fallback={<LoadingSpinner />}>
          {modelData && (
            <Model 
              url={modelData.url} 
              fileExtension={getFileExtension(modelData.file.name)}
            />
          )}
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          enableDamping={true}
        />
      </Canvas>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md p-2 flex space-x-2">
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <Move3D className="w-3 h-3" />
            <span>Drag to rotate</span>
          </div>
          <div className="w-px bg-gray-300"></div>
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <ZoomIn className="w-3 h-3" />
            <span>Scroll to zoom</span>
          </div>
        </div>
      </div>

      {/* No Model State */}
      {!modelData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 opacity-50">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
                <ellipse cx="50" cy="25" rx="25" ry="8" fill="#9CA3AF" />
                <rect x="25" y="25" width="50" height="40" fill="#6B7280" />
                <ellipse cx="50" cy="65" rx="25" ry="8" fill="#4B5563" />
              </svg>
            </div>
            <p>Upload a 3D model to view it here</p>
          </div>
        </div>
      )}
    </div>
  );
}