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
      <h2 style={{ fontSize: '13px', margin: '0 0 12px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--text-primary)' }}>Order Entry</h2>
      <div className="order-entry-controls">
        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Price</div>
          <NumericInput 
            value={price} 
            onChange={setPrice} 
            style={{ width: '100%', height: '36px', boxSizing: 'border-box' }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Quantity</div>
          <NumericInput 
            value={quantity} 
            onChange={setQuantity} 
            style={{ width: '100%', height: '36px', boxSizing: 'border-box' }} 
          />
        </div>
        <div className="order-entry-buttons" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="modern-button btn-buy" 
            onClick={() => onSendOrder(Side.Buy)} 
            disabled={disabled}
            style={{ padding: '0 32px', height: '36px', fontSize: '13px' }}
          >
            BUY
          </button>
          <button 
            className="modern-button btn-sell" 
            onClick={() => onSendOrder(Side.Sell)} 
            disabled={disabled}
            style={{ padding: '0 32px', height: '36px', fontSize: '13px' }}
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
};
