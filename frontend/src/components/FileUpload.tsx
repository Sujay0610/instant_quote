'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[], apiResponse?: any) => void;
  sessionId?: string;
}

export default function FileUpload({ onFileUpload, sessionId }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Process all files
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add session ID if provided
        const url = sessionId 
          ? `http://localhost:8000/upload?session_id=${encodeURIComponent(sessionId)}`
          : 'http://localhost:8000/upload';
        
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return { file, result };
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      console.log('All uploads successful:', uploadResults);
      
      // Pass all uploaded files and their analysis data to parent
      onFileUpload(files, uploadResults);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError('Please upload valid 3D files (STL, OBJ, STEP, IGES, 3MF)');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      // Check file size for all files
      const oversizedFiles = acceptedFiles.filter(file => file.size > 100 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError(`File size must be less than 100MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      handleFileUpload(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.stl'],
      'application/sla': ['.stl'],
      'model/stl': ['.stl'],
      'text/plain': ['.obj'],
      'application/step': ['.step', '.stp'],
      'application/iges': ['.iges', '.igs'],
      'model/3mf': ['.3mf'],
      'application/3mf': ['.3mf']
    },
    multiple: true,
    disabled: isProcessing
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* 3D Model Icon */}
        <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full text-gray-400"
            fill="currentColor"
          >
            {/* Simple 3D cylinder representation */}
            <ellipse cx="50" cy="25" rx="25" ry="8" fill="#9CA3AF" />
            <rect x="25" y="25" width="50" height="40" fill="#6B7280" />
            <ellipse cx="50" cy="65" rx="25" ry="8" fill="#4B5563" />
            {/* Side cylinder */}
            <ellipse cx="75" cy="45" rx="8" ry="15" fill="#9CA3AF" />
            <rect x="75" y="30" width="15" height="30" fill="#6B7280" />
            <ellipse cx="82" cy="60" rx="8" ry="4" fill="#4B5563" />
          </svg>
        </div>

        {isProcessing ? (
          <div className="space-y-2">
            <div className="animate-spin mx-auto w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-600">Processing your files...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg text-gray-700 mb-2">
                {isDragActive ? 'Drop your files here' : 'Drag and drop your files here'}
              </p>
              <p className="text-gray-500 text-sm mb-4">OR</p>
              <button 
                type="button"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Select files
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="mt-4 flex items-start space-x-2 text-sm text-gray-600">
        <div className="w-4 h-4 mt-0.5 flex-shrink-0">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-full h-full text-green-600">
            <path fillRule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5z" />
          </svg>
        </div>
        <p>
          Privacy: All your files are fully secured with our{' '}
          <a href="#" className="text-blue-600 hover:underline">Privacy policy</a>.
          If you can't upload your part right now, you can also try our instant quote system with one of our samples.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Supported Formats */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 mb-2">Supported formats:</p>
        <div className="flex justify-center space-x-4 text-xs text-gray-400">
          <span>STL</span>
          <span>OBJ</span>
          <span>STEP</span>
          <span>IGES</span>
          <span>3MF</span>
        </div>
      </div>
    </div>
  );
}