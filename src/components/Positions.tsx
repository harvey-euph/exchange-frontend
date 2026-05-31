import React from 'react';

interface PositionsProps {
  positions: [number, bigint][];
}

export const Positions: React.FC<PositionsProps> = ({ positions }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Positions</h2>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}>
              <th>Sym</th><th>Pos</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(([sId, pos]) => (
              <tr key={sId} style={{ borderBottom: '1px solid #111' }}>
                <td>{sId}</td>
                <td style={{ color: pos > 0n ? '#4ec9b0' : pos < 0n ? '#f44747' : '#d4d4d4' }}>{pos.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
