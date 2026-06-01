import React, { useState, useCallback, useEffect, useRef } from 'react';

interface LogViewerProps {
  title: string;
  messages: string[];
  show: boolean;
  onClose: () => void;
  color: string;
  logRef: React.RefObject<HTMLDivElement | null>;
}

export const LogViewer: React.FC<LogViewerProps> = ({ title, messages, show, onClose, color, logRef }) => {
  const [size, setSize] = useState({ width: 400, height: 300 });
  const isResizing = useRef<string | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  const isMgmt = title.includes('Management');

  const onMouseDown = useCallback((type: string) => (e: React.MouseEvent) => {
    isResizing.current = type;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: size.width, height: size.height };
    e.preventDefault();
  }, [size]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = startPos.current.y - e.clientY; // resizing from bottom, but height grows upwards

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      if (isResizing.current.includes('right')) {
        newWidth = startSize.current.width + deltaX;
      } else if (isResizing.current.includes('left')) {
        newWidth = startSize.current.width - deltaX;
      }

      if (isResizing.current.includes('top')) {
        newHeight = startSize.current.height + deltaY;
      }

      setSize({
        width: Math.max(200, newWidth),
        height: Math.max(100, newHeight)
      });
    };

    const onMouseUp = () => {
      isResizing.current = null;
    };

    if (show) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [show]);

  if (!show) return null;

  const positionStyle: React.CSSProperties = isMgmt 
    ? { right: '20px' } 
    : { left: '20px' };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '60px', 
      ...positionStyle, 
      width: `${size.width}px`, 
      height: `${size.height}px`, 
      backgroundColor: '#1e1e1e', 
      border: '1px solid #333', 
      borderRadius: '2px', 
      display: 'flex', 
      flexDirection: 'column', 
      zIndex: 1000, 
      boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
      fontFamily: 'var(--mono), monospace',
      fontSize: '11px'
    }}>
      {/* Edge Resizers */}
      <div 
        onMouseDown={onMouseDown(isMgmt ? 'left' : 'right')}
        style={{ 
          position: 'absolute', 
          top: 0, 
          bottom: 0, 
          width: '6px', 
          [isMgmt ? 'left' : 'right']: '-3px', 
          cursor: 'ew-resize', 
          zIndex: 1001 
        }} 
      />
      <div 
        onMouseDown={onMouseDown('top')}
        style={{ 
          position: 'absolute', 
          top: '-3px', 
          left: 0, 
          right: 0, 
          height: '6px', 
          cursor: 'ns-resize', 
          zIndex: 1001 
        }}
      />
      <div 
        onMouseDown={onMouseDown(isMgmt ? 'top-left' : 'top-right')}
        style={{ 
          position: 'absolute', 
          top: '-3px', 
          [isMgmt ? 'left' : 'right']: '-3px', 
          width: '10px', 
          height: '10px', 
          cursor: isMgmt ? 'nwse-resize' : 'nesw-resize', 
          zIndex: 1002 
        }}
      />

      <div style={{ 
        padding: '4px 10px', 
        backgroundColor: '#252526', 
        borderBottom: '1px solid #333',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        userSelect: 'none',
        color: '#cccccc',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 'bold',
        fontSize: '10px'
      }}>
        <span>{title}</span>
        <button onClick={onClose} style={{ 
          background: 'none', 
          border: 'none', 
          color: '#cccccc', 
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '14px',
          lineHeight: '1'
        }}>×</button>
      </div>
      <div ref={logRef} className="custom-scrollbar" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '8px',
        lineHeight: '1.4'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '1px', whiteSpace: 'pre-wrap', color }}>{msg}</div>
        ))}
      </div>
    </div>
  );
};
