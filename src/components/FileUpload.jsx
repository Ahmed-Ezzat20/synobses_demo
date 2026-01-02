import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

const FileUpload = ({ file, onFile }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (files) => {
    if (files && files[0]) {
      onFile(files[0]);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current.click()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded p-10 cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 bg-gray-900'
        }`}
      >
        <UploadCloud className="w-10 h-10 mb-4 text-indigo-400" />
        <p className="text-sm">
          {file ? <span className="text-green-400">{file.name}</span> : 'Drag & drop an audio file here or click to browse'}
        </p>
        <input
          type="file"
          accept="audio/*"
          ref={inputRef}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUpload;
