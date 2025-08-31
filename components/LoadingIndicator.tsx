import React, { useState, useEffect } from 'react';

const subMessages = [
    "Analyzing geometric properties...",
    "Querying geospatial database...",
    "Comparing path signatures...",
    "Cross-referencing map data...",
    "Finalizing route candidates...",
];

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => {
    const [subMessageIndex, setSubMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSubMessageIndex(prevIndex => (prevIndex + 1) % subMessages.length);
        }, 2500); // Change message every 2.5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center text-gray-400 py-10 px-4 flex flex-col items-center justify-center h-full">
             <svg className="w-16 h-16 text-cyan-500" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="282.74" strokeDashoffset="212.05">
                    <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 50 50" 
                        to="360 50 50" 
                        dur="1.5s" 
                        repeatCount="indefinite" />
                    <animate 
                        attributeName="stroke-dashoffset" 
                        values="282.74;141.37;282.74" 
                        dur="3s" 
                        repeatCount="indefinite" />
                </circle>
            </svg>
            <h3 className="mt-4 text-md font-semibold text-gray-200">{message}</h3>
            <p className="mt-1 text-sm text-gray-500 transition-opacity duration-500 h-5">
                {subMessages[subMessageIndex]}
            </p>
        </div>
    );
};

export default LoadingIndicator;