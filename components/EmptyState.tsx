import React from 'react';

const EmptyState: React.FC = () => {
    return (
        <div className="text-center text-gray-500 py-10 px-4 border-2 border-dashed border-gray-700 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-400">No Routes Found</h3>
            <p className="mt-1 text-sm text-gray-500">Your matching routes will appear here once you start a search.</p>
        </div>
    );
};

export default EmptyState;