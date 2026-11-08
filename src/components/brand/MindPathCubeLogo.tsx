import React from 'react';

interface MindPathCubeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  pulse?: boolean;
}

export const MindPathCubeLogo: React.FC<MindPathCubeLogoProps> = ({
  size = 'md',
  className = '',
  pulse = true,
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`relative ${sizeMap[size]} shrink-0 ${className} select-none`}>
      {/* Background Soft Neon Glow Aura */}
      {pulse && (
        <div className="absolute inset-[-10%] bg-gradient-to-tr from-cyan-500/40 via-purple-600/50 to-pink-500/40 rounded-2xl blur-[8px] opacity-70 animate-pulse pointer-events-none" />
      )}

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(168,85,247,0.45)]"
      >
        <defs>
          {/* Top Face Gradient */}
          <linearGradient id="cubeTopGrad" x1="18" y1="16" x2="82" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="45%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Top Inset Well Gradient */}
          <linearGradient id="topWellGrad" x1="26" y1="23" x2="74" y2="49" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>

          {/* Left Face Gradient */}
          <linearGradient id="cubeLeftGrad" x1="18" y1="34" x2="50" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7e22ce" />
            <stop offset="40%" stopColor="#581c87" />
            <stop offset="100%" stopColor="#1e1035" />
          </linearGradient>

          {/* Left Inset Panel */}
          <linearGradient id="leftPanelGrad" x1="18" y1="40" x2="33" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Right Face Gradient */}
          <linearGradient id="cubeRightGrad" x1="50" y1="52" x2="82" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Right Inset Panel */}
          <linearGradient id="rightPanelGrad" x1="67" y1="40" x2="82" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Cyber Glow Rim */}
          <linearGradient id="cyanRimGrad" x1="50" y1="88" x2="82" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* 1. Left Isometric Face */}
        <polygon
          points="18,34 50,52 50,88 18,70"
          fill="url(#cubeLeftGrad)"
          stroke="#3b0764"
          strokeWidth="0.8"
        />

        {/* Left Upper Inset Tech Window */}
        <polygon
          points="19,41 33,49 33,60 19,52"
          fill="url(#leftPanelGrad)"
          stroke="#f0abfc"
          strokeWidth="0.5"
          opacity="0.95"
        />

        {/* 2. Right Isometric Face */}
        <polygon
          points="50,52 82,34 82,70 50,88"
          fill="url(#cubeRightGrad)"
          stroke="#1e3a8a"
          strokeWidth="0.8"
        />

        {/* Right Upper Inset Tech Window */}
        <polygon
          points="67,49 81,41 81,52 67,60"
          fill="url(#rightPanelGrad)"
          stroke="#7dd3fc"
          strokeWidth="0.5"
          opacity="0.95"
        />

        {/* 3. Top Isometric Rhombus Face */}
        <polygon
          points="50,16 82,34 50,52 18,34"
          fill="url(#cubeTopGrad)"
          stroke="#e879f9"
          strokeWidth="0.8"
        />

        {/* Top Recessed Isometric Core Well */}
        <polygon
          points="50,22 75,35 50,48 25,35"
          fill="url(#topWellGrad)"
          stroke="#fdf4ff"
          strokeWidth="0.6"
        />

        {/* Top Core High-Light Facet */}
        <polygon
          points="50,26 69,35 50,44 31,35"
          fill="#3b0764"
          opacity="0.5"
        />
        <polygon
          points="50,29 63,35 50,41 37,35"
          fill="#c084fc"
          opacity="0.85"
        />

        {/* Bottom Right Electric Cyan Neon Glow Edge */}
        <polyline
          points="50,88 82,70"
          stroke="url(#cyanRimGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Bottom Left Electric Violet Neon Glow Edge */}
        <polyline
          points="50,88 18,70"
          stroke="#c084fc"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Center Vertical Crest Line */}
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="88"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.7"
        />
      </svg>
    </div>
  );
};
