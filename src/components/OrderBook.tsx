import React from 'react';

interface OrderBookProps {
  bids: { price: bigint; quantity: bigint }[];
  asks: { price: bigint; quantity: bigint }[];
}

export const OrderBook: React.FC<OrderBookProps> = ({ bids, asks }) => {
  return (
    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>L2 Orderbook</h2>
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
              <tr key={`ask-${i}`} style={{ color: '#f44747', textAlign: 'right' }}>
                <td style={{ textAlign: 'left' }}>ASK</td>
                <td>{level.price.toString()}</td>
                <td>{level.quantity.toString()}</td>
              </tr>
            ))}
            <tr style={{ height: '10px' }}><td colSpan={3}></td></tr>
            {bids.map((level, i) => (
              <tr key={`bid-${i}`} style={{ color: '#4ec9b0', textAlign: 'right' }}>
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
