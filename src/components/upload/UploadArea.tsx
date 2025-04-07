
import React from "react";
import { UploadCloud, FileScan, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UploadAreaProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadArea = ({ file, onFileChange }: UploadAreaProps) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
      <UploadCloud className="h-12 w-12 mx-auto text-gray-400" />
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          Támogatott formátumok: <span className="font-medium">PDF</span> (ajánlott), XLS vagy képformátumban (JPG, PNG, GIF, WebP)
        </p>
        <div className="flex flex-col space-y-2">
          <p className="text-xs text-gray-500">
            Az alkalmazás a PDF fájlokat az első oldalukat képként kezelve dolgozza fel a legjobb eredmény érdekében.
          </p>
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
              Fájl kiválasztása
            </span>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {file && (
        <div className="text-sm text-gray-700 mt-2 flex items-center justify-center gap-2">
          {file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
            <FileText className="h-4 w-4 text-primary" />
          ) : (
            <FileScan className="h-4 w-4 text-primary" />
          )}
          <span>Kiválasztott fájl: <span className="font-medium">{file.name}</span></span>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
