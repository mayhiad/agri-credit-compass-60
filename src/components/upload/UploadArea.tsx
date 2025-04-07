
import React from 'react';
import { FileUp, FileText, X } from "lucide-react";

interface UploadAreaProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadArea = ({ file, onFileChange }: UploadAreaProps) => {
  return (
    <div className="mb-4">
      <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center bg-gray-50 relative">
        <input
          type="file"
          id="file-upload"
          onChange={onFileChange}
          className="sr-only"
          accept=".pdf,.doc,.docx,.xlsx,.xls"
        />
        
        {file ? (
          <div className="flex flex-col items-center">
            <FileText className="h-10 w-10 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
              {file.name}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
              {file.size > 15 * 1024 * 1024 && (
                <span className="text-orange-500 ml-1">(Nagy fájlméret - hosszabb feldolgozási idő)</span>
              )}
            </span>
            
            <button
              type="button"
              onClick={() => {
                // Reset the file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) {
                  fileInput.value = '';
                }
                onFileChange({ target: { files: null } } as any);
              }}
              className="mt-3 px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 flex items-center"
            >
              <X className="h-3 w-3 mr-1" /> Eltávolítás
            </button>
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
          >
            <FileUp className="h-10 w-10 text-gray-400 mb-3" />
            <span className="text-sm font-medium text-gray-700">
              Kattintson a dokumentum feltöltéséhez
            </span>
            <span className="text-xs text-gray-500 mt-1">
              PDF vagy Excel dokumentum (max. 50 MB)
            </span>
            <p className="mt-2 text-xs text-blue-600">
              Most már Claude 3 Opus modellel, ami jobban kezeli a nagy dokumentumokat is
            </p>
          </label>
        )}
      </div>
    </div>
  );
};

export default UploadArea;
