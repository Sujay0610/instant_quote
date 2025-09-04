'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Upload, ShoppingCart, ArrowLeft, Info, Plus, Minus } from 'lucide-react';

interface QuotePanelProps {
  file: File;
  modelData: any;
  analysisData: any;
  onGoBack: () => void;
  showOnlyCart?: boolean;
  showOnlyQuote?: boolean;
  onCartItemSelect?: (item: any) => void;
  cartItems?: any[];
  onAddFiles?: (files: File[]) => void;
  isProcessing?: boolean;
}

interface ProcessOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Material {
  id: string;
  name: string;
  description: string;
  color: string;
}

const processes: ProcessOption[] = [
  { id: 'sla', name: 'SLA', description: '3D Printing', icon: '🖨️' },
  { id: 'dmls', name: 'DMLS', description: '3D Printing', icon: '⚡' },
  { id: 'fdm', name: 'FDM', description: '3D Printing', icon: '🔧' },
  { id: 'mjf', name: 'MJF', description: '3D Printing', icon: '💨' },
];

const materials: Material[] = [
  { id: 'abs-white', name: 'ABS-Like White', description: 'Standard plastic', color: '#FFFFFF' },
  { id: 'resin-paint', name: 'Resin With Paint Finish', description: 'High detail with finish', color: '#8B4513' },
  { id: 'pla-black', name: 'PLA Black', description: 'Standard plastic', color: '#000000' },
  { id: 'petg-clear', name: 'PETG Clear', description: 'Chemical resistant', color: '#E0E0E0' },
];

export default function QuotePanel({ file, modelData, analysisData, onGoBack, showOnlyCart = false, showOnlyQuote = false, onCartItemSelect, cartItems = [], onAddFiles, isProcessing = false }: QuotePanelProps) {
  const [selectedCartItem, setSelectedCartItem] = useState<number>(0);
  const [selectedProcess, setSelectedProcess] = useState<string>('fdm');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('abs-white');
  const [showProcesses, setShowProcesses] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [uploadedDrawings, setUploadedDrawings] = useState<File[]>([]);
  
  const processDropdownRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (processDropdownRef.current && !processDropdownRef.current.contains(event.target as Node)) {
        setShowProcesses(false);
      }
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setShowMaterials(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mock pricing calculation
  const calculatePrice = () => {
    const basePricePerCm3 = 2.5;
    const volume = analysisData?.geometry_analysis?.volume || 98; // Default volume for demo
    const basePrice = volume * basePricePerCm3;
    return (basePrice * quantity).toFixed(0);
  };

  const handleDrawingUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedDrawings(prev => [...prev, ...files]);
  };

  const removeDrawing = (index: number) => {
    setUploadedDrawings(prev => prev.filter((_, i) => i !== index));
  };

  const getFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // Handle cart item selection
  const handleCartItemSelect = (index: number) => {
    setSelectedCartItem(index);
    if (onCartItemSelect && cartItems[index]) {
      const selectedItem = cartItems[index];
      onCartItemSelect(selectedItem);
    }
  };

  // Handle file upload for Add Files button
  const handleAddFiles = () => {
    if (!onAddFiles) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stl,.obj';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        onAddFiles(fileArray);
      }
    };
    input.click();
  };

  // If showing only cart, render just the cart section
  if (showOnlyCart) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">My cart</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{cartItems.length} items</span>
          </div>
          <button 
            className={`text-blue-600 hover:text-blue-800 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`} 
            onClick={handleAddFiles}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Add Files'}
          </button>
        </div>
        
        {/* Cart Items */}
        <div className="space-y-2 mb-4">
          {cartItems.map((item, index) => {
            const itemPrice = item.analysisData?.geometry_analysis?.volume ? 
              Math.round(item.analysisData.geometry_analysis.volume * 10) : 105;
            
            return (
              <div key={item.id} className={`bg-gray-50 rounded-lg p-3 border-2 transition-colors cursor-pointer ${
                selectedCartItem === index ? 'border-blue-500 bg-blue-50' : 'border-transparent'
              }`} onClick={() => handleCartItemSelect(index)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded mr-3 flex items-center justify-center">
                      <span className="text-xs text-gray-600">3D</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">₹ {itemPrice.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Not Specified</div>
                    </div>
                  </div>
                  <button className="text-blue-600 text-xs">Remove</button>
                </div>
                <div className="text-xs text-gray-600 ml-13">
                  <div className="font-medium">{item.name.replace(/\.[^/.]+$/, "")}</div>
                  <div className="mt-1">
                    {item.analysisData?.geometry_analysis?.bounding_box ? 
                      `${item.analysisData.geometry_analysis.bounding_box.width.toFixed(1)} x ${item.analysisData.geometry_analysis.bounding_box.height.toFixed(1)} x ${item.analysisData.geometry_analysis.bounding_box.depth.toFixed(1)} mm` : 
                      'Dimensions calculating...'
                    }
                  </div>
                  <div>Material: {materials.find(m => m.id === selectedMaterial)?.name || selectedMaterial}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total Price:</span>
            <span className="text-blue-600">₹ {cartItems.reduce((total, item) => {
              const itemPrice = item.analysisData?.geometry_analysis?.volume ? 
                Math.round(item.analysisData.geometry_analysis.volume * 10) : 105;
              return total + itemPrice;
            }, 0).toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500 text-right">GST NOT INCLUDED</div>
          
          <div className="space-y-2">
            <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors">
              Request Manual Quote
            </button>
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Place Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header - only show if not showOnlyQuote */}
      {!showOnlyQuote && (
        <div className="p-4 border-b">
          <div className="flex items-center mb-2 cursor-pointer" onClick={onGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm text-gray-600">Go back</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{file.name.replace(/\.[^/.]+$/, "")}</h2>
          <p className="text-sm text-gray-600">{file.name.split('.').pop()?.toUpperCase()}</p>
        </div>
      )}

      {/* Model Properties */}
      <div className="p-4 border-b">
        {analysisData?.geometry_analysis ? (
          <div className="space-y-3">
            {/* Dimensions */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-2">Dimensions (mm)</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-gray-500">Width</div>
                  <div className="font-semibold text-gray-900">
                    {analysisData.geometry_analysis.bounding_box ? analysisData.geometry_analysis.bounding_box.width.toFixed(1) : '0.0'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Height</div>
                  <div className="font-semibold text-gray-900">
                    {analysisData.geometry_analysis.bounding_box ? analysisData.geometry_analysis.bounding_box.height.toFixed(1) : '0.0'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Depth</div>
                  <div className="font-semibold text-gray-900">
                    {analysisData.geometry_analysis.bounding_box ? analysisData.geometry_analysis.bounding_box.depth.toFixed(1) : '0.0'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Volume and Surface Area */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Volume</div>
                <div className="font-semibold text-gray-900">
                  {analysisData.geometry_analysis.volume ? `${analysisData.geometry_analysis.volume.toFixed(2)} cm³` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Surface Area</div>
                <div className="font-semibold text-gray-900">
                  {analysisData.geometry_analysis.surface_area ? `${analysisData.geometry_analysis.surface_area.toFixed(2)} cm²` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            <div className="text-sm">Analyzing geometry...</div>
          </div>
        )}
      </div>

      {/* Process Selection */}
      <div className="p-4 border-b">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">1. Select Process</span>
            <span className="text-xs text-blue-600">Please select the process</span>
          </div>
          
          {/* Process Dropdown */}
          <div className="relative" ref={processDropdownRef}>
            <button
              onClick={() => setShowProcesses(!showProcesses)}
              className="w-full p-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-lg mr-3">{processes.find(p => p.id === selectedProcess)?.icon}</span>
                <div>
                  <div className="text-sm font-medium">{processes.find(p => p.id === selectedProcess)?.name}</div>
                  <div className="text-xs text-gray-500">{processes.find(p => p.id === selectedProcess)?.description}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProcesses ? 'rotate-180' : ''}`} />
            </button>
            
            {showProcesses && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {processes.map((process) => (
                  <button
                    key={process.id}
                    onClick={() => {
                      setSelectedProcess(process.id);
                      setShowProcesses(false);
                    }}
                    className={`
                      w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center
                      ${selectedProcess === process.id ? 'bg-blue-50 text-blue-700' : ''}
                      ${process.id === processes[processes.length - 1].id ? '' : 'border-b border-gray-100'}
                    `}
                  >
                    <span className="text-lg mr-3">{process.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{process.name}</div>
                      <div className="text-xs text-gray-500">{process.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Material Selection */}
      <div className="p-4 border-b">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">2. Capabilities and Materials</span>
            <span className="text-xs text-blue-600">Please select a material</span>
          </div>
          
          {/* Material Dropdown */}
          <div className="relative" ref={materialDropdownRef}>
            <button
              onClick={() => setShowMaterials(!showMaterials)}
              className="w-full p-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                  style={{ backgroundColor: materials.find(m => m.id === selectedMaterial)?.color }}
                ></div>
                <div>
                  <div className="text-sm font-medium">{materials.find(m => m.id === selectedMaterial)?.name}</div>
                  <div className="text-xs text-gray-500">{materials.find(m => m.id === selectedMaterial)?.description}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMaterials ? 'rotate-180' : ''}`} />
            </button>
            
            {showMaterials && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {materials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => {
                      setSelectedMaterial(material.id);
                      setShowMaterials(false);
                    }}
                    className={`
                      w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center
                      ${selectedMaterial === material.id ? 'bg-blue-50 text-blue-700' : ''}
                      ${material.id === materials[materials.length - 1].id ? '' : 'border-b border-gray-100'}
                    `}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: material.color }}
                    ></div>
                    <div>
                      <div className="text-sm font-medium">{material.name}</div>
                      <div className="text-xs text-gray-500">{material.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Drawings */}
      <div className="p-4 border-b">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">3. Technical Drawings and Notes</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Choose file</label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  onChange={handleDrawingUpload}
                  className="hidden"
                  id="drawings-upload"
                />
                <label
                  htmlFor="drawings-upload"
                  className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Upload drawings</span>
                </label>
              </div>
              
              {uploadedDrawings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadedDrawings.map((drawing, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span className="truncate">{drawing.name}</span>
                      <button
                        onClick={() => removeDrawing(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Additional notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special requirements or notes..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 border-b bg-blue-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-900 mb-1">₹ {parseInt(calculatePrice()).toLocaleString()}</div>
          <div className="text-xs text-gray-600 mb-2">GST NOT INCLUDED</div>
          <div className="text-xs text-blue-600">₹ {(parseFloat(calculatePrice()) / quantity).toFixed(0)}/Unit</div>
        </div>
      </div>

      {/* Quantity */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Quantity</span>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-medium w-8 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


    </div>
  );
}