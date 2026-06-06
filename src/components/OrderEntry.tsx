import React from 'react';
import { Side } from '../fbs/exchange/side';
import { NumericInput } from './NumericInput';

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
    <div className="modern-card" style={{ padding: '12px' }}>
      <div className="block-header">
        <h2 className="block-title">Order Entry</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Price</div>
          <NumericInput 
            value={price} 
            onChange={setPrice} 
            style={{ flex: 1, height: '32px', boxSizing: 'border-box' }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty</div>
          <NumericInput 
            value={quantity} 
            onChange={setQuantity} 
            style={{ flex: 1, height: '32px', boxSizing: 'border-box' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <div style={{ width: '60px' }} /> {/* Spacer to align buttons under inputs */}
          <div className="order-entry-buttons" style={{ flex: 1, display: 'flex', gap: '12px' }}>
            <button 
              className="modern-button btn-buy" 
              onClick={() => onSendOrder(Side.Buy)} 
              disabled={disabled}
              style={{ flex: 1, height: '36px', fontSize: '13px', fontWeight: 700 }}
            >
              BUY
            </button>
            <button 
              className="modern-button btn-sell" 
              onClick={() => onSendOrder(Side.Sell)} 
              disabled={disabled}
              style={{ flex: 1, height: '36px', fontSize: '13px', fontWeight: 700 }}
            >
              SELL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
