import React from 'react';
import { Loader2 } from 'lucide-react';

const ProgressIndicator = ({ message = 'Processing...', submessage = null }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-lg font-medium text-white">{message}</p>
          {submessage && (
            <p className="text-sm text-gray-400 mt-2">{submessage}</p>
          )}
        </div>
        <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
