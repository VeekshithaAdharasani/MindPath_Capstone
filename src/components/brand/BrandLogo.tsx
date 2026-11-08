import React from 'react';
import { MindPathCubeLogo } from './MindPathCubeLogo.tsx';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const textSizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Isometric Glowing Cube Logo */}
      <MindPathCubeLogo size={size} pulse={true} />

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white ${textSizeMap[size]}`}>
              Mind<span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">Path</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-extrabold uppercase tracking-wider">
              AI
            </span>
          </div>
          <span className="text-[10px] text-cyan-300 font-medium tracking-wide">
            Your AI Companion
          </span>
        </div>
      )}
    </div>
  );
};