import React, { useState, useEffect } from 'react';
import { Side } from '../fbs/exchange/side';
import type { OrderData } from '../types';
import { NumericInput } from './NumericInput';

interface OpenOrdersProps {
  orders: OrderData[];
  onModify: (order: OrderData, newPrice: string, newQty: string) => void;
  onCancel: (order: OrderData) => void;
}

export const OpenOrders: React.FC<OpenOrdersProps> = ({
  orders, onModify, onCancel
}) => {
  const [editValues, setEditValues] = useState<Record<string, { p: string, q: string }>>({});
  const lastOrdersRef = React.useRef<Map<string, { p: string, q: string }>>(new Map());

  // Initialize or update edit values when orders change
  useEffect(() => {
    setEditValues(prev => {
      const next = { ...prev };
      orders.forEach(o => {
        const orderId = o.orderId;
        const pStr = o.p.toString();
        const qStr = o.q.toString();
        const last = lastOrdersRef.current.get(orderId);

        // Update if:
        // 1. New order
        // 2. Order values in props changed (backend update)
        // 3. Or if we don't have a value for it yet
        if (!next[orderId] || (last && (last.p !== pStr || last.q !== qStr))) {
          next[orderId] = { p: pStr, q: qStr };
        }
        lastOrdersRef.current.set(orderId, { p: pStr, q: qStr });
      });

      // Cleanup removed orders
      const currentIds = new Set(orders.map(o => o.orderId));
      Object.keys(next).forEach(id => {
        if (!currentIds.has(id)) {
          delete next[id];
          lastOrdersRef.current.delete(id);
        }
      });

      return next;
    });
  }, [orders]);

  const handleUpdate = (orderId: string, field: 'p' | 'q', val: string) => {
    setEditValues(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: val }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, order: OrderData) => {
    if (e.key === 'Enter') {
      const vals = editValues[order.orderId];
      if (vals) {
        onModify(order, vals.p, vals.q);
      }
      // Revert immediately to current prop values
      handleRevert(order.orderId, order);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      handleRevert(order.orderId, order);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleRevert = (orderId: string, order: OrderData) => {
    setEditValues(prev => ({
      ...prev,
      [orderId]: { p: order.p.toString(), q: order.q.toString() }
    }));
  };

  return (
    <div className="modern-card open-orders-section">
      <h2 style={{ fontSize: '13px', margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)' }}>Open Orders</h2>
      <div className="table-container custom-scroll">
        <table className="modern-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'right' }}>ID</th>
              <th style={{ width: '42px', textAlign: 'right' }}>Side</th>
              <th style={{ textAlign: 'right', width: '80px' }}>Price</th>
              <th style={{ textAlign: 'right', width: '70px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '45px' }}>Fill</th>
              <th style={{ textAlign: 'right', width: '55px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, index) => {
              const vals = editValues[o.orderId] || { p: o.p.toString(), q: o.q.toString() };
              const isModified = vals.p !== o.p.toString() || vals.q !== o.q.toString();
              const displayId = `**${o.orderId.slice(-6)}`;
              
              return (
                <tr 
                  key={o.orderId} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}
                >
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.orderId}>{displayId}</td>
                  <td style={{ 
                    textAlign: 'right',
                    color: o.side === Side.Buy ? 'var(--accent-green)' : o.side === Side.Sell ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '10px'
                  }}>
                    {Side[o.side]}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <NumericInput 
                      value={vals.p} 
                      onChange={(v) => handleUpdate(o.orderId, 'p', v)}
                      onKeyDown={(e) => handleKeyDown(e, o)}
                      onBlur={() => handleRevert(o.orderId, o)}
                      style={{ 
                        width: '100%', 
                        height: '22px', 
                        textAlign: 'right', 
                        fontSize: '11px',
                        border: isModified ? '1px solid var(--accent-blue)' : '1px solid transparent',
                        backgroundColor: isModified ? 'var(--bg-input)' : 'transparent',
                        padding: '0 4px'
                      }} 
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <NumericInput 
                      value={vals.q} 
                      onChange={(v) => handleUpdate(o.orderId, 'q', v)}
                      onKeyDown={(e) => handleKeyDown(e, o)}
                      onBlur={() => handleRevert(o.orderId, o)}
                      style={{ 
                        width: '100%', 
                        height: '22px', 
                        textAlign: 'right', 
                        fontSize: '11px',
                        border: isModified ? '1px solid var(--accent-blue)' : '1px solid transparent',
                        backgroundColor: isModified ? 'var(--bg-input)' : 'transparent',
                        padding: '0 4px'
                      }} 
                    />
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px' }}>{o.filled.toString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="modern-button btn-sell" 
                      onClick={() => onCancel(o)}
                      style={{ padding: '2px 4px', fontSize: '10px', height: '22px', minWidth: '45px' }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            })}
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
