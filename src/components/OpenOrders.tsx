import React from 'react';
import { Side } from '../fbs/exchange/side';
import type { OrderData } from '../types';

interface OpenOrdersProps {
  orders: OrderData[];
  modQty: Record<string, string>;
  setModQty: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onModify: (order: OrderData) => void;
  onCancel: (order: OrderData) => void;
}

export const OpenOrders: React.FC<OpenOrdersProps> = ({
  orders, modQty, setModQty, onModify, onCancel
}) => {
  return (
    <div className="modern-card" style={{ flex: 2.5, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '13px', margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)' }}>Open Orders</h2>
      <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scroll">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Side</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Filled</th>
              <th style={{ textAlign: 'center' }}>New Qty</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ color: 'var(--text-secondary)' }}>{o.orderId}</td>
                <td style={{ 
                  color: o.side === Side.Buy ? 'var(--accent-green)' : o.side === Side.Sell ? 'var(--accent-red)' : 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  {Side[o.side]}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{o.p.toString()}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{o.q.toString()}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{o.filled.toString()}</td>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="text" 
                    className="modern-input"
                    value={modQty[o.orderId] || ''} 
                    placeholder={o.q.toString()} 
                    onChange={e => setModQty(prev => ({ ...prev, [o.orderId]: e.target.value }))} 
                    style={{ width: '60px', padding: '2px 6px', textAlign: 'right' }} 
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="modern-button btn-secondary" 
                      onClick={() => onModify(o)}
                      style={{ padding: '4px 12px', fontSize: '11px' }}
                    >
                      Modify
                    </button>
                    <button 
                      className="modern-button btn-sell" 
                      onClick={() => onCancel(o)}
                      style={{ padding: '4px 12px', fontSize: '11px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No open orders
          </div>
        )}
      </div>
    </div>
  );
};
