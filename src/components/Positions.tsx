import React, { useMemo } from 'react';

interface PositionsProps {
  positions: [number, bigint][];
  prices: Map<number, bigint>;
}

export const Positions: React.FC<PositionsProps> = ({ positions, prices }) => {
  const totalValue = useMemo(() => {
    let value = 0n;
    for (const [sId, pos] of positions) {
      if (sId === 0) {
        value += pos;
      } else {
        const price = prices.get(sId) || 0n;
        value += pos * price;
      }
    }
    return value;
  }, [positions, prices]);

  return (
    <div className="modern-card positions-section">
      <div className="block-header">
        <h2 className="block-title">Positions</h2>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '8px' }}>Total Value:</span>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            {totalValue.toString()}
          </span>
        </div>
      </div>
      <div className="table-container custom-scroll">
        <table className="modern-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'right' }}>Sym</th>
              <th style={{ textAlign: 'right', width: '80px' }}>Pos</th>
              <th style={{ textAlign: 'right', width: '80px' }}>Price</th>
              <th style={{ textAlign: 'right', width: '95px' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(([sId, pos]) => {
              const isCash = sId === 0;
              const price = isCash ? 1n : (prices.get(sId) || 0n);
              const value = isCash ? pos : pos * price;
              return (
                <tr key={sId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ textAlign: 'right', color: isCash ? 'var(--accent-blue)' : 'var(--text-primary)', fontWeight: isCash ? 600 : 400, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isCash ? 'CASH' : sId}
                  </td>
                  <td style={{ 
                    textAlign: 'right',
                    color: pos > 0n ? 'var(--accent-green)' : pos < 0n ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontSize: '11px'
                  }}>
                    {pos.toString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {isCash ? '1' : price.toString()}
                  </td>
                  <td style={{ 
                    textAlign: 'right',
                    color: value > 0n ? 'var(--accent-green)' : value < 0n ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontSize: '11px'
                  }}>
                    {value.toString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {positions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No positions
          </div>
        )}
      </div>
    </div>
  );
};
