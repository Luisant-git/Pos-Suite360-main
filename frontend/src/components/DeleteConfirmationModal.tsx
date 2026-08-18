import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title = "Delete Confirmation",
  message = "Are you sure you want to delete this item?",
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shrink-0 shadow-sm border border-red-200">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 font-medium">
            {message}
          </p>
          {itemName && (
            <div className="mt-4 px-4 py-2 bg-white rounded-lg border border-red-100 font-bold text-red-600 shadow-sm">
              "{itemName}"
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 flex gap-3 justify-center sm:justify-end">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors focus:ring-4 focus:ring-gray-100 outline-none flex-1 sm:flex-none"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors focus:ring-4 focus:ring-red-200 outline-none flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
