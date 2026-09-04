import React, { useState } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

const PhotoUpload = ({ files, onChange }: Props) => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = [...files, ...selectedFiles];
    onChange(newFiles);

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);

    URL.revokeObjectURL(previews[index]);
    setPreviews(previews.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {previews.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
            <img src={url} alt={`Site preview ${idx}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeFile(idx)}
              className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors text-text-soft hover:text-blue hover:border-blue/50">
          <Camera className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase">Add Photo</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {files.length === 0 && (
        <div className="flex items-center gap-3 text-text-soft italic text-xs px-2">
          <ImageIcon className="h-4 w-4" />
          Capture site conditions, cable routes, and mounting locations.
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
