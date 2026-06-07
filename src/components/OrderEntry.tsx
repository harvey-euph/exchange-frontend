import React from 'react';
import { Side } from '../fbs/exchange/side';
import { NumericInput } from './NumericInput';

interface OrderEntryProps {
  price: string;
  quantity: string;
  side: Side;
  peggedLevel: number | null;
  setPrice: (v: string) => void;
  setQuantity: (v: string) => void;
  setSide: (s: Side) => void;
  setPeggedLevel: (p: number | null) => void;
  onSendOrder: (side: Side) => void;
  disabled?: boolean;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({
  price, quantity, side, peggedLevel, 
  setPrice, setQuantity, setSide, setPeggedLevel,
  onSendOrder, disabled
}) => {

  const handlePriceChange = (v: string) => {
    setPrice(v);
    setPeggedLevel(null);
  };

  const handleQtyChange = (v: string) => {
    setQuantity(v);
    setPeggedLevel(null);
  };

  const getPegDisplay = () => {
    if (peggedLevel === null) return '';
    return `PEG TO ${side === Side.Buy ? 'BID' : 'ASK'} ${peggedLevel}`;
  };

  return (
    <div className="modern-card" style={{ padding: '12px', marginBottom: '16px' }}>
      <div className="block-header">
        <h2 className="block-title">Order Entry</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Side Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Side</div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="orderSide" 
                checked={side === Side.Buy} 
                onChange={() => { setSide(Side.Buy); setPeggedLevel(null); }}
                disabled={disabled}
              />
              Buy
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="orderSide" 
                checked={side === Side.Sell} 
                onChange={() => { setSide(Side.Sell); setPeggedLevel(null); }}
                disabled={disabled}
              />
              Sell
            </label>
          </div>
        </div>

        {/* Price Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Price</div>
          <NumericInput 
            value={peggedLevel !== null ? getPegDisplay() : price} 
            onChange={handlePriceChange} 
            style={{ 
              flex: 1, 
              height: '32px', 
              boxSizing: 'border-box',
              color: peggedLevel !== null ? 'var(--accent-blue)' : 'inherit',
              fontWeight: peggedLevel !== null ? 700 : 'normal',
              fontSize: peggedLevel !== null ? '11px' : '13px'
            }} 
            disabled={disabled}
          />
        </div>

        {/* Quantity Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty</div>
          <NumericInput 
            value={quantity} 
            onChange={handleQtyChange} 
            style={{ flex: 1, height: '32px', boxSizing: 'border-box' }} 
            disabled={disabled}
          />
        </div>

        {/* Send Button */}
        <div style={{ marginTop: '4px' }}>
          <button 
            className={`modern-button ${side === Side.Buy ? 'btn-buy' : 'btn-sell'}`} 
            onClick={() => onSendOrder(side)} 
            disabled={disabled}
            style={{ width: '100%', height: '36px', fontSize: '13px', fontWeight: 700 }}
          >
            SEND ORDER
          </button>
        </div>
      </div>
    </div>
  );
};
