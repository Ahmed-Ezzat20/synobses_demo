import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';

const FileUploadEnhanced = ({ file, onFile }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const validateFile = (file) => {
    setError('');

    if (!file) {
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return false;
    }

    if (file.size === 0) {
      setError('File is empty');
      return false;
    }

    // Check file type
    const validExtensions = ['mp3', 'wav', 'mp4', 'webm', 'ogg', 'm4a', 'flac'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setError(`Invalid file type. Allowed: ${validExtensions.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        onFile(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        onFile(selectedFile);
      }
    }
  };

  const handleRemove = () => {
    onFile(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : error
              ? 'border-red-500 bg-red-500/5'
              : 'border-gray-700 hover:border-gray-600 bg-gray-800'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept=".mp3,.wav,.mp4,.webm,.ogg,.m4a,.flac,audio/*,video/mp4,video/webm"
          />
          
          <Upload className={`w-12 h-12 mx-auto mb-4 ${error ? 'text-red-400' : 'text-gray-400'}`} />
          
          <p className="text-lg font-medium text-white mb-2">
            {dragActive ? 'Drop your file here' : 'Upload Audio File'}
          </p>
          
          <p className="text-sm text-gray-400 mb-4">
            Drag and drop or click to browse
          </p>
          
          <p className="text-xs text-gray-500">
            Supported formats: MP3, WAV, MP4, WebM, OGG, M4A, FLAC
            <br />
            Maximum file size: 100MB
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-indigo-500/20 rounded">
                <File className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Type: {file.type || 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Remove file"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadEnhanced;
