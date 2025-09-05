'use client';

import { useState, useEffect } from 'react';
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
  const [sessionId, setSessionId] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [duplicateNotification, setDuplicateNotification] = useState<string | null>(null);

  // Generate session ID on component mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

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
    setUploadError(null);
    setDuplicateNotification(null);
    
    try {
      const successfulUploads: any[] = [];
      const errors: string[] = [];
      const duplicates: string[] = [];
      
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const url = `http://localhost:8000/upload?session_id=${encodeURIComponent(sessionId)}`;
          const response = await fetch(url, {
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
            
            successfulUploads.push(cartItem);
          } else if (response.status === 409) {
            // Handle duplicate files as informational messages
            const errorData = await response.json();
            duplicates.push(`${file.name}: ${errorData.detail || 'File already exists'}`);
          } else {
            // Handle actual errors
            const errorData = await response.json();
            errors.push(`${file.name}: ${errorData.detail || 'Upload failed'}`);
          }
        } catch (fileError) {
          errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Upload failed'}`);
        }
      }
      
      // Add successful uploads to cart
      if (successfulUploads.length > 0) {
        setCartItems(prev => [...prev, ...successfulUploads]);
      }
      
      // Show duplicate notifications
      if (duplicates.length > 0) {
        setDuplicateNotification(duplicates.join('\n'));
      }
      
      // Show actual errors if any
      if (errors.length > 0) {
        setUploadError(errors.join('\n'));
      }
      
    } catch (error) {
      console.error('Error adding files:', error);
      setUploadError('An unexpected error occurred while uploading files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromCart = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/session/${encodeURIComponent(sessionId)}/file/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from local cart state
        setCartItems(prev => prev.filter(item => item.name !== filename));
        
        // If the removed item was currently selected, select the first remaining item
        const remainingItems = cartItems.filter(item => item.name !== filename);
        if (remainingItems.length > 0 && (currentFile?.name === filename)) {
          const firstItem = remainingItems[0];
          setCurrentFile(firstItem.file);
          setCurrentModelData(firstItem.modelData);
          setCurrentAnalysisData(firstItem.analysisData);
        } else if (remainingItems.length === 0) {
          // No items left, clear current selection
          setCurrentFile(null);
          setCurrentModelData(null);
          setCurrentAnalysisData(null);
        }
      } else {
        const errorData = await response.json();
        setUploadError(`Failed to remove file: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing file:', error);
      setUploadError('Failed to remove file from cart.');
    }
  };

  const handleGoBack = async () => {
    // Clear session data on backend
    if (sessionId) {
      try {
        await fetch(`http://localhost:8000/session/clear?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    }
    
    setUploadedFiles([]);
    setModelData(null);
    setAnalysisData(null);
    setIsProcessing(false);
    setCurrentFile(null);
    setCurrentModelData(null);
    setCurrentAnalysisData(null);
    setCartItems([]);
    setUploadError(null);
    
    // Generate new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
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
            {duplicateNotification && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">File Already Exists</h3>
                    <div className="mt-2 text-sm text-blue-700 whitespace-pre-line">
                      {duplicateNotification}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => setDuplicateNotification(null)}
                        className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {uploadError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                    <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                      {uploadError}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => setUploadError(null)}
                        className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <FileUpload onFileUpload={handleFileUpload} sessionId={sessionId} />
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
                  uploadError={uploadError}
                  onClearUploadError={() => setUploadError(null)}
                  duplicateNotification={duplicateNotification}
                  onClearDuplicateNotification={() => setDuplicateNotification(null)}
                  onRemoveFromCart={handleRemoveFromCart}
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
