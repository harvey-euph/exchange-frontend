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
    <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
      <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Open Orders</h2>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}>
              <th>ID</th><th>Side</th><th>Price</th><th>Qty</th><th>Filled</th><th>New Qty</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId} style={{ borderBottom: '1px solid #111' }}>
                <td>{o.orderId}</td>
                <td style={{ color: o.side === Side.Buy ? '#4ec9b0' : o.side === Side.Sell ? '#f44747' : '#888' }}>{Side[o.side]}</td>
                <td>{o.p.toString()}</td>
                <td>{o.q.toString()}</td>
                <td>{o.filled.toString()}</td>
                <td>
                  <input 
                    type="text" 
                    value={modQty[o.orderId] || ''} 
                    placeholder={o.q.toString()} 
                    onChange={e => setModQty(prev => ({ ...prev, [o.orderId]: e.target.value }))} 
                    style={{ width: '40px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '2px' }} 
                  />
                </td>
                <td>
                  <button onClick={() => onModify(o)} style={{ backgroundColor: '#3e3e3e', color: '#fff', border: 'none', padding: '2px 6px', marginRight: '5px', cursor: 'pointer' }}>Modify</button>
                  <button onClick={() => onCancel(o)} style={{ backgroundColor: '#5a2727', color: '#fff', border: 'none', padding: '2px 6px', cursor: 'pointer' }}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
