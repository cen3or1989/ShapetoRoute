
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
                <div className="flex items-center space-x-2">
                    <div className="bg-cyan-800 text-cyan-200 px-2 py-1 rounded-full">
                        <strong className="font-semibold">{(route.similarityScore * 100).toFixed(0)}%</strong> AI
                    </div>
                    {route.geometricSimilarity !== undefined && (
                        <div className={`px-2 py-1 rounded-full ${
                            route.geometricSimilarity > 0.7 ? 'bg-green-800 text-green-200' :
                            route.geometricSimilarity > 0.5 ? 'bg-yellow-800 text-yellow-200' :
                            'bg-red-800 text-red-200'
                        }`}>
                            <strong className="font-semibold">{(route.geometricSimilarity * 100).toFixed(0)}%</strong> geo
                        </div>
                    )}
                </div>
            </div>
            {route.matchingIssues && route.matchingIssues.length > 0 && (
                <div className="mt-2 text-xs text-yellow-400">
                    <div className="font-semibold">Geometric notes:</div>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        {route.matchingIssues.map((issue, idx) => (
                            <li key={idx} className="text-yellow-300">{issue}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RouteResultItem;
