import { useState, useRef, useMemo, useEffect } from 'react';
import { Side } from './fbs/exchange/side';
import { useExchange } from './hooks/useExchange';
import { OrderBook } from './components/OrderBook';
import { OrderEntry } from './components/OrderEntry';
import { OpenOrders } from './components/OpenOrders';
import { Positions } from './components/Positions';
import { LogViewer } from './components/LogViewer';
import './App.css';

function App() {
  const [clientId, setClientId] = useState('101');
  const [symbolId, setSymbolId] = useState('1');
  const [price, setPrice] = useState('5000');
  const [quantity, setQuantity] = useState('100');
  const [modQty, setModQty] = useState<Record<string, string>>({});
  
  const [showMgmtLogs, setShowMgmtLogs] = useState(false);
  const [showL2Logs, setShowL2Logs] = useState(false);

  const mgmtLogRef = useRef<HTMLDivElement>(null);
  const l2LogRef = useRef<HTMLDivElement>(null);

  const {
    connected,
    bids,
    asks,
    openOrders,
    positions,
    mgmtMessages,
    l2Messages,
    connectMgmt,
    connectL2,
    disconnectAll,
    sendOrder,
    cancelOrder,
    modifyOrder
  } = useExchange();

  useEffect(() => {
    if (mgmtLogRef.current && showMgmtLogs) mgmtLogRef.current.scrollTop = mgmtLogRef.current.scrollHeight;
  }, [mgmtMessages, showMgmtLogs]);

  useEffect(() => {
    if (l2LogRef.current && showL2Logs) l2LogRef.current.scrollTop = l2LogRef.current.scrollHeight;
  }, [l2Messages, showL2Logs]);

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

  const handleSendOrder = (side: Side) => sendOrder(side, clientId, symbolId, price, quantity);
  const handleCancelOrder = (order: any) => cancelOrder(order, clientId);
  const handleModifyOrder = (order: any) => modifyOrder(order, clientId, modQty[order.orderId] || order.q.toString());

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontSize: '11px', textAlign: 'left', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: '#569cd6', margin: 0, fontSize: '16px' }}>Harvey Exchange</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span>Client ID:</span>
            <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '40px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '2px 4px', fontSize: '11px' }} />
            <button onClick={() => connectMgmt(clientId, symbolId)} style={{ backgroundColor: connected.mgmt ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>{connected.mgmt ? 'Reconnect Mgmt' : 'Connect Mgmt'}</button>
            <button onClick={connectL2} style={{ backgroundColor: connected.l2 ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>{connected.l2 ? 'Reconnect L2' : 'Connect L2'}</button>
            <button onClick={disconnectAll} style={{ backgroundColor: '#5a2727', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>Disconnect All</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowMgmtLogs(!showMgmtLogs)} style={{ backgroundColor: '#444', color: '#fff', border: '1px solid #555', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>{showMgmtLogs ? 'Hide Mgmt Logs' : 'Mgmt Logs'}</button>
          <button onClick={() => setShowL2Logs(!showL2Logs)} style={{ backgroundColor: '#444', color: '#fff', border: '1px solid #555', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>{showL2Logs ? 'Hide L2 Logs' : 'L2 Logs'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        <OrderBook 
          symbolId={symbolId} onSymbolChange={setSymbolId}
          bids={sortedBids} asks={sortedAsks} onPriceClick={setPrice} 
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <OrderEntry 
            price={price} quantity={quantity}
            setPrice={setPrice} setQuantity={setQuantity}
            onSendOrder={handleSendOrder}
          />

          <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
            <OpenOrders 
              orders={Array.from(openOrders.values())}
              modQty={modQty}
              setModQty={setModQty}
              onModify={handleModifyOrder}
              onCancel={handleCancelOrder}
            />
            <Positions positions={Array.from(positions.entries())} />
          </div>
        </div>
      </div>

      <LogViewer 
        title="Management Logs" messages={mgmtMessages} show={showMgmtLogs} 
        onClose={() => setShowMgmtLogs(false)} color="#b5cea8" logRef={mgmtLogRef} 
      />
      <LogViewer 
        title="L2 Logs" messages={l2Messages} show={showL2Logs} 
        onClose={() => setShowL2Logs(false)} color="#ce9178" logRef={l2LogRef} 
      />
    </div>
  );
}

export default App;
