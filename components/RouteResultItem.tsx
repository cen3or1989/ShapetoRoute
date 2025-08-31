import React from 'react';
import type { Route } from '../types';

interface RouteResultItemProps {
    route: Route;
    index: number;
    isActive: boolean;
    onClick: () => void;
}

const RouteResultItem: React.FC<RouteResultItemProps> = ({ route, isActive, onClick }) => {
    const similarityColor = () => {
        const score = route.similarityScore;
        if (score > 0.8) return 'text-green-400 bg-green-900/50';
        if (score > 0.6) return 'text-yellow-400 bg-yellow-900/50';
        if (score > 0.4) return 'text-orange-400 bg-orange-900/50';
        return 'text-red-400 bg-red-900/50';
    };

    const getQualityIcon = () => {
        const score = route.similarityScore;
        if (score > 0.8) return '⭐';
        if (score > 0.6) return '✓';
        if (score > 0.4) return '~';
        return '?';
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                isActive 
                ? 'bg-gray-700/80 border-cyan-500 shadow-lg shadow-cyan-900/50' 
                : 'bg-gray-800/80 border-transparent hover:bg-gray-700/60 hover:border-gray-600'
            }`}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-md truncate pr-4">
                    <span className="mr-2">{getQualityIcon()}</span>
                    {route.routeName}
                </h3>
                <div className={`px-2.5 py-1 text-xs font-bold rounded-full ${similarityColor()}`}>
                    {(route.similarityScore * 100).toFixed(0)}% Match
                </div>
            </div>
            
            <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{route.description}</p>
            
            <div className="flex items-center mt-4 text-sm text-gray-300 border-t border-gray-700 pt-3">
                <div className="flex items-center space-x-6">
                    <span className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <strong className="font-semibold text-white mr-1">{route.distance.toFixed(1)}</strong> km
                    </span>
                    <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <strong className="font-semibold text-white mr-1">{route.duration}</strong> min
                    </span>
                </div>
            </div>
        </div>
    );
};

export default RouteResultItem;