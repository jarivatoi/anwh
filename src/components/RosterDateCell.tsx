import React from 'react';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

interface RosterDateCellProps {
  date: string;
  isToday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  onLongPress: () => void;
  isSpecialDate?: boolean;
  specialDateInfo?: string;
  formatTableDate: (dateString: string) => { dayName: string; dateString: string };
}

export const RosterDateCell: React.FC<RosterDateCellProps> = ({
  date,
  isToday,
  isPastDate,
  isFutureDate,
  onLongPress,
  isSpecialDate = false,
  specialDateInfo,
  formatTableDate
}) => {
  return (
    <td 
      style={{ 
        position: 'sticky',
        left: 0,
        zIndex: 75,
        padding: '4px',
        textAlign: 'center',
        minHeight: '50px',
        border: 'none',
        margin: 0,
        width: '80px', // Fixed width instead of percentage
        minWidth: '80px', // Ensure minimum width
        maxWidth: '80px', // Prevent expansion
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        backgroundColor: isToday ? '#bbf7d0' : 
                         isPastDate ? '#fef2f2' :
                         isFutureDate ? '#f0fdf4' : '#ffffff',
        background: isSpecialDate ? '#fecaca' : 
                   isToday ? '#bbf7d0' : 
                   isPastDate ? '#fef2f2' :
                   isFutureDate ? '#f0fdf4' : '#ffffff',
        opacity: 1,
        border: '2px solid #374151',
        borderRight: '3px solid #374151',
        // Force proper rendering after orientation change
        transform: 'translate3d(0,0,0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitTransform: 'translate3d(0,0,0)',
        // iPhone specific
        WebkitTouchCallout: 'none'
      }}
    >
     <button
        {...useLongPress({
          onLongPress,
          delay: 5000
        })}
        className={`text-center w-full h-full p-1 rounded transition-colors duration-200 ${
          isSpecialDate ? 'bg-red-300' :
          isToday ? 'bg-green-300' : 'hover:bg-gray-100'
        }`}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          // Invisible button with perfect centering for all devices including iPhone
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          textAlign: 'center',
          // Force hardware acceleration for iPhone
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitTransform: 'translate3d(0,0,0)',
          // iPhone specific touch handling
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10, // Above watermark but below other content
          // Remove any visual styling
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <div className={`font-medium text-[10px] sm:text-[12px] leading-tight relative z-20 ${
          isSpecialDate ? 'text-red-900' :
          isToday ? 'text-green-900' : 'text-gray-900'
        }`} style={{
          textAlign: 'center',
          width: '100%',
          display: 'block',
          fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px'
        }}>
          {formatTableDate(date).dayName}
        </div>
        <div className={`font-medium text-[10px] sm:text-[12px] leading-tight relative z-20 ${
          isSpecialDate ? 'text-red-900' :
          isToday ? 'text-green-900' : 'text-gray-900'
        }`} style={{
          textAlign: 'center',
          width: '100%',
          display: 'block',
          fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px'
        }}>
          {formatTableDate(date).dateString}
        </div>
        
        {/* Special Date Info - Scrolling Text at Bottom */}
        {isSpecialDate && specialDateInfo && (
          <div className="absolute bottom-0 left-0 right-0 z-20" style={{
            height: '16px',
            overflow: 'hidden',
            padding: '2px',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderTop: '1px solid rgba(220, 38, 38, 0.3)'
          }}>
            <ScrollingText 
              text={specialDateInfo}
              className="text-red-900 font-bold"
              style={{
                fontSize: window.innerWidth > window.innerHeight ? '9px' : '10px',
                lineHeight: '16px',
                textAlign: 'center'
              }}
            />
          </div>
        )}
      </button>
    </td>
  );
};