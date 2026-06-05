import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Side } from './fbs/exchange/side';
import { useExchange } from './hooks/useExchange';
import { OrderBook } from './components/OrderBook';
import { OrderEntry } from './components/OrderEntry';
import { OpenOrders } from './components/OpenOrders';
import { Positions } from './components/Positions';
import { NotificationSystem } from './components/NotificationSystem';
import type { NotificationSystemRef } from './components/NotificationSystem';
import './App.css';

function App() {
  const [clientId, setClientId] = useState('101');
  const [symbolId, setSymbolId] = useState('1');
  const [price, setPrice] = useState('5000');
  const [quantity, setQuantity] = useState('100');
  
  const notifRef = useRef<NotificationSystemRef>(null);

  const handleNotification = useCallback((type: 'acked' | 'rejected' | 'info', title: string, content: string) => {
    notifRef.current?.addNotification(type, title, content);
  }, []);

  const {
    connected,
    bids,
    asks,
    prices,
    openOrders,
    positions,
    connectMgmt,
    connectL2,
    subscribeL2,
    sendOrder,
    cancelOrder,
    modifyOrder
  } = useExchange(parseInt(symbolId), handleNotification);

  useEffect(() => {
    if (symbolId !== '0') {
      subscribeL2(parseInt(symbolId));
    }
  }, [symbolId, subscribeL2, connected.l2]);

  const sortedAsks = useMemo(() => 
    Array.from(asks.entries())
      .map(([p, q]) => ({ price: p, quantity: q }))
      .sort((a, b) => (a.price > b.price ? -1 : 1)), 
  [asks]);

  const sortedBids = useMemo(() => 
    Array.from(bids.entries())
      .map(([p, q]) => ({ price: p, quantity: q }))
      .sort((a, b) => (a.price > b.price ? -1 : 1)), 
  [bids]);

  const handleSendOrder = (side: Side) => {
    if (!connected.mgmtReady) {
      handleNotification('rejected', 'Error', 'Please login first');
      return;
    }
    sendOrder(side, clientId, symbolId, price, quantity);
  };
  
  const handleCancelOrder = (order: any) => cancelOrder(order, clientId);
  const handleModifyOrder = (order: any, newPrice: string, newQty: string) => modifyOrder(order, clientId, newPrice, newQty);

  return (
    <div className="app-container">
      <NotificationSystem ref={notifRef} />
      
      <header className="header-container">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: 'var(--accent-blue)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>H</div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>Harvey Exchange</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '2px 12px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Client ID</span>
              <input 
                type="text" 
                className="modern-input"
                value={clientId} 
                onChange={(e) => setClientId(e.target.value)} 
                style={{ width: '50px', padding: '2px 6px' }} 
              />
            </div>
            <button 
              className={`modern-button ${connected.mgmtReady ? 'btn-primary' : (connected.mgmt ? 'btn-secondary' : 'btn-primary')}`}
              onClick={() => connectMgmt(clientId, symbolId)}
              style={{ padding: '4px 12px', fontSize: '11px' }}
            >
              {connected.mgmt ? (connected.mgmtReady ? "✓ Connected" : "Syncing...") : "Login"}
            </button>
          </div>
        </div>

        <div className="header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected.l2 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>L2 Feed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected.mgmtReady ? 'var(--accent-green)' : 'var(--accent-red)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Trading API</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <OrderBook 
          symbolId={symbolId} onSymbolChange={setSymbolId}
          bids={sortedBids} asks={sortedAsks} onPriceClick={setPrice} 
          onReconnectL2={connectL2}
        />

        <div className="right-panel">
          <OrderEntry 
            price={price} quantity={quantity}
            setPrice={setPrice} setQuantity={setQuantity}
            onSendOrder={handleSendOrder}
            disabled={!connected.mgmtReady}
          />

          <div className="bottom-row">
            <OpenOrders 
              orders={Array.from(openOrders.values())}
              onModify={handleModifyOrder}
              onCancel={handleCancelOrder}
            />
            <Positions positions={Array.from(positions.entries())} prices={prices} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
