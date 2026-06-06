import React, { useMemo, useState, useEffect } from 'react';
import type { SymbolPosition } from '../types';
import { Side } from '../fbs/exchange/side';

interface PositionsProps {
  positions: [number, SymbolPosition][];
  cash: bigint;
  prices: Map<number, bigint>;
  currentSymbolId?: string;
  onFlatten?: (symbolId: number, side: Side, quantity: bigint) => void;
}

export const Positions: React.FC<PositionsProps> = ({ positions, cash, prices, currentSymbolId, onFlatten }) => {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<number>>(new Set());

  const activePositions = useMemo(() => 
    positions.filter(([_, p]) => p.totalQuantity !== 0n || p.realizedPnL !== 0n)
      .sort((a, b) => a[0] - b[0]),
  [positions]);

  useEffect(() => {
    if (currentSymbolId !== undefined) {
      const sid = parseInt(currentSymbolId);
      if (!isNaN(sid)) {
        setExpandedSymbols(new Set([sid]));
      }
    }
  }, [currentSymbolId]);

  const toggleSymbol = (sid: number) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const totalValue = useMemo(() => {
    let value = cash;
    for (const [sId, pos] of positions) {
      const price = prices.get(sId) || pos.averagePrice || 0n;
      const posValue = pos.side === Side.Buy ? pos.totalQuantity * price : -pos.totalQuantity * price;
      value += posValue;
    }
    return value;
  }, [positions, cash, prices]);

  const isAllExpanded = activePositions.length > 0 && activePositions.every(([sId]) => expandedSymbols.has(sId));

  return (
    <div className="modern-card positions-section">
      <div className="block-header">
        <h2 className="block-title">Positions</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="modern-button btn-secondary" 
            onClick={() => isAllExpanded ? setExpandedSymbols(new Set()) : setExpandedSymbols(new Set(activePositions.map(p => p[0])))}
            style={{ padding: '2px 8px', fontSize: '10px', height: '22px' }}
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
          <div style={{ textAlign: 'right', minWidth: '100px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '8px' }}>Equity:</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              {totalValue.toString()}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Available Cash</span>
        <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 600 }}>{cash.toString()}</span>
      </div>

      <div className="table-container custom-scroll">
        <table className="modern-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'left' }}>Sym</th>
              <th style={{ textAlign: 'right', width: '60px' }}>Pos</th>
              <th style={{ width: '40px' }}></th>
              <th style={{ textAlign: 'right', width: '80px' }}>Avg/Mark</th>
              <th style={{ textAlign: 'right', width: '85px' }}>PnL (U/R)</th>
            </tr>
          </thead>
          <tbody>
            {activePositions.map(([sId, pos]) => {
              const markPrice = prices.get(sId) || pos.averagePrice || 0n;
              const unrealizedPnL = pos.side === Side.Buy 
                ? (markPrice - pos.averagePrice) * pos.totalQuantity
                : (pos.averagePrice - markPrice) * pos.totalQuantity;
              
              const displayPos = pos.side === Side.Sell ? -pos.totalQuantity : pos.totalQuantity;
              const isExpanded = expandedSymbols.has(sId);

              // Group lots by orderId
              const groupedLots = [];
              const orderIdMap = new Map();
              
              for (const lot of pos.lots) {
                if (orderIdMap.has(lot.orderId)) {
                  const grouped = orderIdMap.get(lot.orderId);
                  grouped.totalPrice += lot.price * lot.quantity;
                  grouped.quantity += lot.quantity;
                  grouped.timestamp = Math.max(grouped.timestamp, lot.timestamp);
                } else {
                  const grouped = { 
                    orderId: lot.orderId, 
                    quantity: lot.quantity, 
                    totalPrice: lot.price * lot.quantity, 
                    timestamp: lot.timestamp 
                  };
                  orderIdMap.set(lot.orderId, grouped);
                  groupedLots.push(grouped);
                }
              }

              return (
                <React.Fragment key={sId}>
                  <tr 
                    className="symbol-group-header" 
                    onClick={() => toggleSymbol(sId)}
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)' }}
                  >
                    <td style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`} style={{ fontSize: '8px' }}>▼</span>
                        {sId}
                      </div>
                    </td>
                    <td style={{ 
                      textAlign: 'right',
                      color: displayPos > 0n ? 'var(--accent-green)' : displayPos < 0n ? 'var(--accent-red)' : 'var(--text-secondary)',
                      fontSize: '11px'
                    }}>
                      {displayPos.toString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {pos.totalQuantity !== 0n && onFlatten && (
                        <button 
                          className="modern-button btn-secondary flat-btn" 
                          onClick={(e) => { e.stopPropagation(); onFlatten(sId, pos.side, pos.totalQuantity); }}
                          style={{ padding: '0px 4px', fontSize: '8px', height: '14px', lineHeight: '12px', minWidth: 'auto' }}
                        >
                          FLAT
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '10px' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{pos.averagePrice.toString()}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{markPrice.toString()}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '10px' }}>
                      <div style={{ color: unrealizedPnL >= 0n ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {unrealizedPnL >= 0n ? '+' : ''}{unrealizedPnL.toString()}
                      </div>
                      <div style={{ color: pos.realizedPnL >= 0n ? 'var(--text-secondary)' : 'var(--accent-red)', opacity: 0.8 }}>
                        {pos.realizedPnL >= 0n ? '+' : ''}{pos.realizedPnL.toString()}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && groupedLots.map((gl, idx) => {
                    const avgPrice = gl.totalPrice / gl.quantity;
                    return (
                      <tr key={`${gl.orderId}-${idx}`} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: idx === groupedLots.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <td style={{ paddingLeft: '20px', fontSize: '9px', color: 'var(--text-secondary)' }}>
                          {gl.orderId === 'sync' ? 'SYNC' : `*${gl.orderId.slice(-4)}`}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {gl.quantity.toString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {onFlatten && (
                            <button 
                              className="modern-button btn-secondary flat-btn" 
                              onClick={(e) => { e.stopPropagation(); onFlatten(sId, pos.side, gl.quantity); }}
                              style={{ padding: '0px 3px', fontSize: '7px', height: '12px', lineHeight: '10px', minWidth: 'auto' }}
                            >
                              FLAT
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {avgPrice.toString()}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '9px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <span>{new Date(gl.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {activePositions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No active positions
          </div>
        )}
      </div>
    </div>
  );
};
