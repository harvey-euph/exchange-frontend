import React from 'react';

interface LogViewerProps {
  title: string;
  messages: string[];
  show: boolean;
  onClose: () => void;
  color: string;
  logRef: React.RefObject<HTMLDivElement | null>;
}

export const LogViewer: React.FC<LogViewerProps> = ({ title, messages, show, onClose, color, logRef }) => {
  if (!show) return null;

  const positionStyle: React.CSSProperties = title.includes('Management') 
    ? { right: '20px' } 
    : { left: '20px' };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '60px', 
      ...positionStyle, 
      width: '400px', 
      height: '300px', 
      backgroundColor: '#000', 
      border: '1px solid #555', 
      borderRadius: '4px', 
      display: 'flex', 
      flexDirection: 'column', 
      zIndex: 1000, 
      boxShadow: '0 0 10px rgba(0,0,0,0.5)' 
    }}>
      <div style={{ padding: '5px 10px', backgroundColor: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
      </div>
      <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '2px', whiteSpace: 'pre-wrap', color }}>{msg}</div>
        ))}
      </div>
    </div>
  );
};
