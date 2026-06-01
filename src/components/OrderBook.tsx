import React from 'react';

interface OrderBookProps {
  symbolId: string;
  onSymbolChange: (v: string) => void;
  bids: { price: bigint; quantity: bigint }[];
  asks: { price: bigint; quantity: bigint }[];
  onPriceClick?: (price: string) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbolId, onSymbolChange, bids, asks, onPriceClick }) => {
  return (
    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <style>{`
        .ob-row:hover {
          background-color: #222;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
        <h2 style={{ fontSize: '12px', margin: 0 }}>L2 Orderbook</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>Sym:</span>
          <input 
            type="text" 
            value={symbolId} 
            onChange={e => onSymbolChange(e.target.value)} 
            style={{ width: '30px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '1px 4px', fontSize: '11px' }} 
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#888', textAlign: 'right' }}>
              <th style={{ textAlign: 'left' }}>Side</th>
              <th>Price</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {asks.map((level, i) => (
              <tr 
                key={`ask-${i}`} 
                className="ob-row"
                style={{ color: '#f44747', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => onPriceClick?.(level.price.toString())}
              >
                <td style={{ textAlign: 'left' }}>ASK</td>
                <td>{level.price.toString()}</td>
                <td>{level.quantity.toString()}</td>
              </tr>
            ))}
            <tr style={{ height: '10px' }}><td colSpan={3}></td></tr>
            {bids.map((level, i) => (
              <tr 
                key={`bid-${i}`} 
                className="ob-row"
                style={{ color: '#4ec9b0', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => onPriceClick?.(level.price.toString())}
              >
                <td style={{ textAlign: 'left' }}>BID</td>
                <td>{level.price.toString()}</td>
                <td>{level.quantity.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
