import { X } from 'lucide-react';

interface LeaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LeaveConfirmModal = ({ isOpen, onClose, onConfirm }: LeaveConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
        <div className="bg-[#EF4444] px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">Confirm Navigation</h3>
          <button type="button" onClick={onClose} className="hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-gray-700 font-medium mb-1 text-center">Are you sure you want to leave?</p>
          <p className="text-gray-500 text-[13px] text-center mb-5">Any unsaved changes will be lost.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-[#EF4444] text-white font-bold rounded hover:bg-red-600 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveConfirmModal;

