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
  realtimeStatus?: 'connecting' | 'connected' | 'error' | 'disconnected';
  onManualRefresh?: (date?: string) => void;
  isRefreshing?: boolean;
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
  formatTableDate,
  realtimeStatus = 'disconnected',
  onManualRefresh,
  isRefreshing = false
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
        
        {/* Refresh button and status indicator */}
        {onManualRefresh && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            zIndex: 30
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManualRefresh(date);
              }}
              disabled={isRefreshing}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '1px',
                color: isToday ? '#065f46' : isSpecialDate ? '#7f1d1d' : '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                opacity: isRefreshing ? 0.7 : 1,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                width: '16px',
                height: '16px',
                justifyContent: 'center'
              }}
              title={
                realtimeStatus === 'connected' ? 'Manual refresh (Real-time active)' :
                realtimeStatus === 'connecting' ? 'Manual refresh (Connecting...)' :
                realtimeStatus === 'error' ? 'Manual refresh (Real-time failed)' :
                'Manual refresh (Real-time disconnected)'
              }
            >
              {/* Refresh icon with rotation animation when loading */}
              <svg 
                style={{
                  width: '12px',
                  height: '12px',
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
            
            {/* Real-time status indicator */}
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: realtimeStatus === 'connected' ? '#10b981' : 
                              realtimeStatus === 'connecting' ? '#f59e0b' :
                              realtimeStatus === 'error' ? '#ef4444' : '#6b7280',
              animation: realtimeStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              boxShadow: realtimeStatus === 'connected' ? '0 0 4px rgba(16, 185, 129, 0.8)' : 'none'
            }} />
          </div>
        )}
        
        {/* Special Date Info - Scrolling Text at Bottom */}
       {isSpecialDate && specialDateInfo && specialDateInfo.trim() !== '' && (
          <div className="relative mt-1 left-0 right-0 z-20" style={{
            height: '20px',
            overflow: 'hidden',
            padding: '0 2px',
            width: '100%'
          }}>
            <ScrollingText 
              text={specialDateInfo}
              className="text-red-800 font-medium"
              style={{
                fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px',
                lineHeight: window.innerWidth > window.innerHeight ? '14px' : '16px',
                textAlign: 'center'
              }}
            />
          </div>
        )}
      </button>
    </td>
  );
};