import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"
        aria-label="Loading"
      ></div>
      <p className="mt-4 text-gray-700 text-lg">Analyzing...</p>
    </div>
  );
};

export default LoadingSpinner;
