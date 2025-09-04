'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ModelViewer from '../components/ModelViewer';
import QuotePanel from '@/components/QuotePanel';

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [modelData, setModelData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentModelData, setCurrentModelData] = useState<any>(null);
  const [currentAnalysisData, setCurrentAnalysisData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const handleFileUpload = (files: File[], uploadResults?: any[]) => {
    setUploadedFiles(files);
    setIsProcessing(false);
    
    if (files.length > 0 && uploadResults) {
      // Create cart items for all uploaded files
      const newCartItems = uploadResults.map((result, index) => {
        const file = result.file;
        const fileUrl = URL.createObjectURL(file);
        const modelDataObj = { url: fileUrl, file: file };
        
        return {
          id: Date.now() + index,
          file: file,
          modelData: modelDataObj,
          analysisData: result.result,
          name: file.name
        };
      });
      
      // Add all new items to cart
      setCartItems(prevItems => [...prevItems, ...newCartItems]);
      
      // Set current item to the first uploaded file
      const firstItem = newCartItems[0];
      setCurrentFile(firstItem.file);
      setCurrentModelData(firstItem.modelData);
      setCurrentAnalysisData(firstItem.analysisData);
      setModelData(firstItem.modelData);
      setAnalysisData(firstItem.analysisData);
    }
  };

  const handleCartItemSelect = (item: any) => {
    setCurrentFile(item.file);
    setCurrentModelData(item.modelData);
    setCurrentAnalysisData(item.analysisData);
  };

  const handleAddFiles = async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          const fileUrl = URL.createObjectURL(file);
          const modelDataObj = { url: fileUrl, file: file };
          
          const cartItem = {
            id: Date.now() + Math.random(),
            file: file,
            modelData: modelDataObj,
            analysisData: result,
            name: file.name
          };
          
          setCartItems(prev => [...prev, cartItem]);
        }
      }
    } catch (error) {
      console.error('Error adding files:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoBack = () => {
    setUploadedFiles([]);
    setModelData(null);
    setAnalysisData(null);
    setIsProcessing(false);
    setCurrentFile(null);
    setCurrentModelData(null);
    setCurrentAnalysisData(null);
    setCartItems([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">3D Quote</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900">Industries</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Manufacturing</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Materials</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">About Us</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Resources</a>
              <a href="#" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Let's Talk</a>
              <a href="#" className="text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-50">Instant Quote</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploadedFiles.length === 0 ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Upload your files to get an Instant Quotation
            </h2>
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: 3D Viewer and Cart */}
            <div className="lg:col-span-2 space-y-6">
              {/* 3D Viewer */}
              <ModelViewer modelData={currentModelData || modelData} />
              
              {/* Cart Section - moved below 3D viewer */}
              <div className="bg-white rounded-lg shadow-sm border">
                <QuotePanel 
                  file={currentFile || uploadedFiles[0]} 
                  modelData={currentModelData || modelData} 
                  analysisData={currentAnalysisData || analysisData} 
                  onGoBack={handleGoBack} 
                  showOnlyCart={true} 
                  onCartItemSelect={handleCartItemSelect}
                  cartItems={cartItems}
                  onAddFiles={handleAddFiles}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
            
            {/* Right Column: Quote Panel without Cart */}
            <div className="lg:col-span-2">
              <QuotePanel 
                file={currentFile || uploadedFiles[0]} 
                modelData={currentModelData || modelData} 
                analysisData={currentAnalysisData || analysisData} 
                onGoBack={handleGoBack} 
                showOnlyQuote={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
