import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-500 pb-2">
                RouteShaper
            </h1>
            <p className="text-gray-400">Draw a shape, discover a real-world route.</p>
        </header>
    );
};

export default Header;
