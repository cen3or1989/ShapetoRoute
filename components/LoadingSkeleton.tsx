import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-4 rounded-lg bg-gray-700/50 border-2 border-gray-600"
        >
          <div className="h-5 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-full mb-3"></div>
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <div className="h-4 bg-gray-600 rounded w-16"></div>
              <div className="h-4 bg-gray-600 rounded w-16"></div>
            </div>
            <div className="h-6 bg-gray-600 rounded-full w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;