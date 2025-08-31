
import React from 'react';
import type { Route } from '../types';

interface RouteResultItemProps {
    route: Route;
    index: number;
    isActive: boolean;
    onClick: () => void;
}

const RouteResultItem: React.FC<RouteResultItemProps> = ({ route, isActive, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                isActive 
                ? 'bg-cyan-900/50 border-cyan-600 shadow-lg' 
                : 'bg-gray-700/50 border-transparent hover:bg-gray-700 hover:border-gray-600'
            }`}
        >
            <h3 className="font-bold text-white text-md truncate">{route.routeName}</h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{route.description}</p>
            <div className="flex justify-between items-center mt-3 text-xs text-gray-300">
                <div className="flex items-center space-x-4">
                    <span>
                        <strong className="font-semibold text-white">{route.distance.toFixed(1)}</strong> km
                    </span>
                    <span>
                        <strong className="font-semibold text-white">{route.duration}</strong> min
                    </span>
                </div>
                <div className="bg-cyan-800 text-cyan-200 px-2 py-1 rounded-full">
                    <strong className="font-semibold">{(route.similarityScore * 100).toFixed(0)}%</strong> match
                </div>
            </div>
        </div>
    );
};

export default RouteResultItem;
