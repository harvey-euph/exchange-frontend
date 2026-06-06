import React, { useState, useEffect, useRef } from 'react';

interface OrderBookProps {
  symbolId: string;
  onSymbolChange: (v: string) => void;
  bids: { price: bigint; quantity: bigint }[];
  asks: { price: bigint; quantity: bigint }[];
  onPriceClick?: (price: string) => void;
  onReconnectL2?: () => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbolId, onSymbolChange, bids, asks, onPriceClick, onReconnectL2 }) => {
  const [midColor, setMidColor] = useState('var(--text-primary)');
  const prevMidRef = useRef<bigint | null>(null);

  // Take 5 best asks (lowest prices). Since asks is [High ... Low], we take the last 5.
  const displayAsks = asks.slice(-5);
  const paddedAsks = [...Array(Math.max(0, 5 - displayAsks.length)).fill(null), ...displayAsks];

  // Take 5 best bids (highest prices). Since bids is [High ... Low], we take the first 5.
  const displayBids = bids.slice(0, 5);
  const paddedBids = [...displayBids, ...Array(Math.max(0, 5 - displayBids.length)).fill(null)];

  const isCash = symbolId === '0';

  const bestBid = bids[0]?.price;
  const bestAsk = asks[asks.length - 1]?.price;
  const currentMid = (bestBid !== undefined && bestAsk !== undefined) ? (bestBid + bestAsk) / 2n : null;

  useEffect(() => {
    if (currentMid !== null && prevMidRef.current !== null) {
      if (currentMid > prevMidRef.current) {
        setMidColor('var(--accent-green)');
      } else if (currentMid < prevMidRef.current) {
        setMidColor('var(--accent-red)');
      }
    }
    prevMidRef.current = currentMid;
  }, [currentMid]);

  return (
    <div className="modern-card order-book-container">
      <div className="block-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="reconnect-btn-modern" onClick={onReconnectL2} title="Reconnect L2">↻</button>
          {/* <h2 className="block-title">Order Book</h2> */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Symbol:</span>
          <input 
            type="text" 
            className="modern-input"
            value={symbolId} 
            onChange={e => onSymbolChange(e.target.value)} 
            style={{ width: '40px', padding: '2px 6px' }} 
          />
        </div>
      </div>
      
      <div className="custom-scroll">
        {isCash ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>
            Cash has no orderbook.
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Side</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {paddedAsks.map((level, i) => (
                <tr 
                  key={`ask-${i}`} 
                  style={{ cursor: level ? 'pointer' : 'default', height: '22px' }}
                  onClick={() => level && onPriceClick?.(level.price.toString())}
                >
                  <td style={{ color: level ? 'var(--accent-red)' : 'transparent', fontWeight: 600 }}>ASK</td>
                  <td style={{ textAlign: 'right', color: level ? 'var(--text-primary)' : 'var(--border-color)' }}>
                    {level ? level.price.toString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: level ? 'var(--text-secondary)' : 'var(--border-color)' }}>
                    {level ? level.quantity.toString() : '-'}
                  </td>
                </tr>
              ))}
              
              <tr style={{ height: '36px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <td colSpan={3} style={{ 
                  textAlign: 'center', 
                  color: midColor, 
                  fontSize: '18px', 
                  verticalAlign: 'middle', 
                  fontWeight: 700,
                  transition: 'color 0.2s ease'
                }}>
                  {currentMid !== null ? currentMid.toString() : '-'}
                </td>
              </tr>

              {paddedBids.map((level, i) => (
                <tr 
                  key={`bid-${i}`} 
                  style={{ cursor: level ? 'pointer' : 'default', height: '22px' }}
                  onClick={() => level && onPriceClick?.(level.price.toString())}
                >
                  <td style={{ color: level ? 'var(--accent-green)' : 'transparent', fontWeight: 600 }}>BID</td>
                  <td style={{ textAlign: 'right', color: level ? 'var(--text-primary)' : 'var(--border-color)' }}>
                    {level ? level.price.toString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: level ? 'var(--text-secondary)' : 'var(--border-color)' }}>
                    {level ? level.quantity.toString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
