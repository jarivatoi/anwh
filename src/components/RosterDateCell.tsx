import React from 'react';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

interface RosterDateCellProps {
  date: string;
  isToday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  onDoublePress: () => void;
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
  onDoublePress,
  onLongPress,
  isSpecialDate = false,
  specialDateInfo,
  formatTableDate
}) => {
  return (
    <td 
      style={{ 
        padding: '4px',
        textAlign: 'center',
        minHeight: '50px',
        border: 'none',
        margin: 0,
        backgroundColor: isToday ? '#bbf7d0' : 
                         isPastDate ? '#fef2f2' :
                         isFutureDate ? '#f0fdf4' : '#ffffff',
        background: isSpecialDate ? '#fecaca' : 
                   isToday ? '#bbf7d0' : 
                   isPastDate ? '#fef2f2' :
                   isFutureDate ? '#f0fdf4' : '#ffffff',
        opacity: 1,
        border: '2px solid #374151',
        width: '15%',
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
          onDoublePress,
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
          fontSize: window.innerWidth > window.innerHeight ? '12px' : '14px',
          fontWeight: '500',
          animation: isSpecialDate ? 'pulse 2s ease-in-out infinite' : 'none'
        }}>
          <div style={{ textAlign: 'center' }}>
            {formatTableDate(date).dateString.split('-')[0]}
          </div>
          <div style={{ textAlign: 'center', fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px', fontWeight: '500' }}>
            {(() => {
              const dateObj = new Date(date);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return monthNames[dateObj.getMonth()];
            })()}
          </div>
          <div style={{ textAlign: 'center', fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px', fontWeight: '500' }}>
            {new Date(date).getFullYear()}
          </div>
        </div>
        
        {/* Special Date Info - Scrolling Text at Bottom */}
        {isSpecialDate && specialDateInfo && (
          <div className="relative mt-1 left-0 right-0 z-20" style={{
            height: '14px',
            overflow: 'hidden',
            padding: '0 2px',
            width: '100%'
          }}>
            <ScrollingText 
              text={specialDateInfo}
              className="text-red-800 font-medium"
              style={{
                fontSize: window.innerWidth > window.innerHeight ? '9px' : '10px',
                lineHeight: '14px',
                textAlign: 'center'
              }}
            />
          </div>
        )}
      </button>
    </td>
  );
};