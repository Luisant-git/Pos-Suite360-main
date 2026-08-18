import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  entriesPerPage: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalEntries,
  entriesPerPage,
  onPageChange,
}) => {
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endEntry = Math.min(currentPage * entriesPerPage, totalEntries);

  return (
    <div className="mt-auto flex flex-col sm:flex-row justify-between items-center bg-white px-4 py-3 border-t border-[#E5E7EB] shrink-0 text-[13px]">
      <div className="text-[#4B5563] mb-3 sm:mb-0">
        Showing <span className="font-bold">{startEntry}</span> to <span className="font-bold">{endEntry}</span> of <span className="font-bold">{totalEntries}</span> entries
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center px-3 py-1.5 border border-[#D1D5DB] rounded hover:bg-gray-50 text-[#374151] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        
        {/* Simple Page Numbers */}
        <div className="hidden sm:flex items-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Only show max 5 page buttons to prevent overflow
            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center border-y border-r border-[#D1D5DB] first:border-l first:rounded-l last:rounded-r font-bold transition-colors ${
                    page === currentPage
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                      : 'bg-white text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="px-2 text-gray-500">...</span>;
            }
            return null;
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="flex items-center justify-center px-3 py-1.5 border border-[#D1D5DB] rounded hover:bg-gray-50 text-[#374151] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors sm:ml-1"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
