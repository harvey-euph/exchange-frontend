import React from 'react';
import { Side } from '../fbs/exchange/side';

interface OrderEntryProps {
  symbolId: string;
  price: string;
  quantity: string;
  setSymbolId: (v: string) => void;
  setPrice: (v: string) => void;
  setQuantity: (v: string) => void;
  onSendOrder: (side: Side) => void;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({
  symbolId, price, quantity, setSymbolId, setPrice, setQuantity, onSendOrder
}) => {
  return (
    <div style={{ border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Order Entry</h2>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>Symbol</div>
          <input type="text" value={symbolId} onChange={e => setSymbolId(e.target.value)} style={{ width: '40px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
        </div>
        <div>
          <div style={{ marginBottom: '4px' }}>Price</div>
          <input type="text" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
        </div>
        <div>
          <div style={{ marginBottom: '4px' }}>Quantity</div>
          <input type="text" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
        </div>
        <button onClick={() => onSendOrder(Side.Buy)} style={{ backgroundColor: '#2d5a27', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}>Buy</button>
        <button onClick={() => onSendOrder(Side.Sell)} style={{ backgroundColor: '#5a2727', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}>Sell</button>
      </div>
    </div>
  );
};
