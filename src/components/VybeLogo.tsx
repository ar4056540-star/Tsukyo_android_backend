import React from 'react';
import { OFFICIAL_VYBE_LOGO_URL } from '../lib/constants';

interface VybeLogoProps {
  className?: string;
  height?: number | string;
}

export const VybeLogo: React.FC<VybeLogoProps> = ({ className = 'h-8 w-auto', height }) => {
  return (
    <img
      src={OFFICIAL_VYBE_LOGO_URL}
      alt="VYBE"
      style={height ? { height } : undefined}
      className={`object-contain select-none shrink-0 ${className}`}
      draggable={false}
    />
  );
};
