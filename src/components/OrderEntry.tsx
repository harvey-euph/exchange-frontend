import React from 'react';
import { Side } from '../fbs/exchange/side';

interface OrderEntryProps {
  price: string;
  quantity: string;
  setPrice: (v: string) => void;
  setQuantity: (v: string) => void;
  onSendOrder: (side: Side) => void;
  disabled?: boolean;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({
  price, quantity, setPrice, setQuantity, onSendOrder, disabled
}) => {
  return (
    <div style={{ border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Order Entry</h2>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>Price</div>
          <input type="text" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
        </div>
        <div>
          <div style={{ marginBottom: '4px' }}>Quantity</div>
          <input type="text" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
        </div>
        <button onClick={() => onSendOrder(Side.Buy)} disabled={disabled} style={{ backgroundColor: disabled ? "#444" : "#2d5a27", color: "#fff", border: "none", padding: "6px 15px", cursor: disabled ? "not-allowed" : "pointer", borderRadius: "2px" }}>Buy</button>
        <button onClick={() => onSendOrder(Side.Sell)} disabled={disabled} style={{ backgroundColor: disabled ? "#444" : "#5a2727", color: "#fff", border: "none", padding: "6px 15px", cursor: disabled ? "not-allowed" : "pointer", borderRadius: "2px" }}>Sell</button>
      </div>
    </div>
  );
};
