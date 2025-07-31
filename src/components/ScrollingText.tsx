import React from 'react';

interface ScrollingTextProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ 
  text, 
  className = '', 
  children 
}) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="truncate">
        {children || text}
      </div>
    </div>
  );
};