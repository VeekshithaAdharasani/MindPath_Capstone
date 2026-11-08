import React from 'react';
import { MindPathCubeLogo } from './MindPathCubeLogo.tsx';

interface AILogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  pulse?: boolean;
}

export const AILogo: React.FC<AILogoProps> = ({
  size = 'md',
  className = '',
  pulse = true,
}) => {
  return (
    <MindPathCubeLogo
      size={size === 'xs' || size === 'sm' || size === 'md' || size === 'lg' || size === 'xl' ? size : 'md'}
      className={className}
      pulse={pulse}
    />
  );
};