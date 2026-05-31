import { useEffect, useState, useRef, useMemo } from 'react'
import * as flatbuffers from 'flatbuffers'
import { L2Update } from './fbs/exchange/l2-update'
import { ClientResponse } from './fbs/exchange/client-response'
import { ClientResponseData } from './fbs/exchange/client-response-data'
import { Side } from './fbs/exchange/side'
import { ExecType } from './fbs/exchange/exec-type'
import { OrderResponse } from './fbs/exchange/order-response'
import { PositionResponse } from './fbs/exchange/position-response'
import { OrderRequest } from './fbs/exchange/order-request'
import { OrderAction } from './fbs/exchange/order-action'
import { OrderType } from './fbs/exchange/order-type'
import { ClientRequest } from './fbs/exchange/client-request'
import { ClientRequestData as ClientReqData } from './fbs/exchange/client-request-data'
import { PositionRequest } from './fbs/exchange/position-request'
import './App.css'

interface OrderData {
  orderId: string;
  symbolId: number;
  side: Side;
  p: bigint;
  q: bigint;
  filled: bigint;
}

function App() {
  const [clientId, setClientId] = useState('101')
  const [connected, setConnected] = useState({ mgmt: false, l2: false })
  
  const [bids, setBids] = useState<Map<bigint, bigint>>(new Map())
  const [asks, setAsks] = useState<Map<bigint, bigint>>(new Map())
  
  const [openOrders, setOpenOrders] = useState<Map<string, OrderData>>(new Map())
  const [positions, setPositions] = useState<Map<number, bigint>>(new Map())
  
  const inflightOrdersRef = useRef<Map<string, { side: Side, symbolId: number }>>(new Map())
  const orderMetadataRef = useRef<Map<string, { side: Side, symbolId: number }>>(new Map())
  const nextExecId = useRef(BigInt(Date.now()))

  const [mgmtMessages, setMgmtMessages] = useState<string[]>([])
  const [l2Messages, setL2Messages] = useState<string[]>([])
  const [showMgmtLogs, setShowMgmtLogs] = useState(false)
  const [showL2Logs, setShowL2Logs] = useState(false)

  const mgmtLogRef = useRef<HTMLDivElement>(null)
  const l2LogRef = useRef<HTMLDivElement>(null)
  const mgmtWsRef = useRef<WebSocket | null>(null)
  const l2WsRef = useRef<WebSocket | null>(null)

  const [symbolId, setSymbolId] = useState('1')
  const [price, setPrice] = useState('100')
  const [quantity, setQuantity] = useState('10')
  const [modQty, setModQty] = useState<Record<string, string>>({})

  const addMgmtLog = (msg: string) => {
    setMgmtMessages(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`].slice(-200))
  }
  const addL2Log = (msg: string) => {
    setL2Messages(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`].slice(-200))
  }

  useEffect(() => {
    if (mgmtLogRef.current && showMgmtLogs) mgmtLogRef.current.scrollTop = mgmtLogRef.current.scrollHeight
  }, [mgmtMessages, showMgmtLogs])

  useEffect(() => {
    if (l2LogRef.current && showL2Logs) l2LogRef.current.scrollTop = l2LogRef.current.scrollHeight
  }, [l2Messages, showL2Logs])

  const handleOrderResponse = (resp: OrderResponse) => {
    const execType = resp.execType()
    const orderId = resp.orderId().toString()
    const execId = resp.execId().toString()
    const q = resp.q()
    const p = resp.p()
    const sId = resp.symbolId()
    const rejectCode = resp.rejectCode()
    
    const execName = ExecType[execType] ?? `Unknown(${execType})`
    addMgmtLog(`[Exec] ID=${orderId} Type=${execName} P=${p} Q=${q} ExecID=${execId}`)

    if (rejectCode !== 0) {
      addMgmtLog(`[Error] Order Rejected: ID=${orderId} Code=${rejectCode}`)
      return
    }

    let meta = orderMetadataRef.current.get(orderId)
    if (!meta) {
      meta = inflightOrdersRef.current.get(execId)
      if (meta && orderId !== '0') {
        orderMetadataRef.current.set(orderId, meta)
      }
    }

    if (execType === ExecType.New) {
      setOpenOrders(prev => {
        const next = new Map(prev)
        if (!next.has(orderId)) {
          next.set(orderId, {
            orderId,
            symbolId: sId,
            side: meta ? meta.side : Side.None,
            p,
            q,
            filled: 0n
          })
        }
        return next
      })
    } else if (execType === ExecType.Replaced) {
      setOpenOrders(prev => {
        const next = new Map(prev)
        const existing = next.get(orderId)
        next.set(orderId, {
          orderId,
          symbolId: sId,
          side: existing ? existing.side : (meta ? meta.side : Side.None),
          p,
          q,
          filled: existing ? existing.filled : 0n
        })
        return next
      })
    } else if (execType === ExecType.PartialFill || execType === ExecType.Fill) {
      setOpenOrders(prev => {
        const next = new Map(prev)
        let order = next.get(orderId)
        if (!order) {
          order = { orderId, symbolId: sId, side: meta ? meta.side : Side.None, p, q: 0n, filled: 0n }
        }
        order.filled += q
        if (execType === ExecType.Fill) {
          next.delete(orderId)
        } else {
          next.set(orderId, { ...order })
        }
        return next
      })

      const side = meta ? meta.side : (openOrders.get(orderId)?.side ?? Side.None)
      if (side !== Side.None) {
        const fillQty = side === Side.Buy ? q : -q
        setPositions(pPrev => {
          const pNext = new Map(pPrev)
          const current = pNext.get(sId) || 0n
          pNext.set(sId, current + fillQty)
          return pNext
        })
      }
    } else if (execType === ExecType.Cancelled) {
      setOpenOrders(prev => {
        const next = new Map(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  const connectMgmt = () => {
    if (mgmtWsRef.current) mgmtWsRef.current.close()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws-mgmt`
    addMgmtLog(`Connecting to Management WS (9001)...`)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    mgmtWsRef.current = ws

    ws.onopen = () => {
      addMgmtLog('Connected')
      setConnected(prev => ({ ...prev, mgmt: true }))
      ws.send(`sub ${clientId}`)
      const builder = new flatbuffers.Builder(1024)
      PositionRequest.startPositionRequest(builder)
      PositionRequest.addClientId(builder, parseInt(clientId))
      PositionRequest.addSymbolId(builder, parseInt(symbolId))
      const offset = PositionRequest.endPositionRequest(builder)
      ClientRequest.startClientRequest(builder)
      ClientRequest.addDataType(builder, ClientReqData.PositionRequest)
      ClientRequest.addData(builder, offset)
      builder.finish(ClientRequest.endClientRequest(builder))
      ws.send(builder.asUint8Array())
    }

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data)
        const bb = new flatbuffers.ByteBuffer(buf)
        const response = ClientResponse.getRootAsClientResponse(bb)
        const dataType = response.dataType()
        if (dataType === ClientResponseData.OrderResponse) {
          const orderResp = response.data(new OrderResponse()) as OrderResponse
          if (orderResp) handleOrderResponse(orderResp)
        } else if (dataType === ClientResponseData.PositionResponse) {
          const posResp = response.data(new PositionResponse()) as PositionResponse
          if (posResp) {
            setPositions(prev => {
              const next = new Map(prev)
              next.set(posResp.symbolId(), posResp.position())
              return next
            })
            addMgmtLog(`Position Sync: Sym=${posResp.symbolId()} Qty=${posResp.position()}`)
          }
        }
      } catch (err) {
        addMgmtLog(`Decode Error: ${err}`)
      }
    }
    ws.onclose = (e) => {
      addMgmtLog(`Disconnected (Code: ${e.code})`)
      setConnected(prev => ({ ...prev, mgmt: false }))
      mgmtWsRef.current = null
    }
    ws.onerror = () => addMgmtLog(`WebSocket Error`)
  }

  const connectL2 = () => {
    if (l2WsRef.current) l2WsRef.current.close()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws-l2`
    addL2Log(`Connecting to L2 WS (9002)...`)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    l2WsRef.current = ws

    ws.onopen = () => {
      addL2Log('Connected')
      setConnected(prev => ({ ...prev, l2: true }))
      ws.send('sub 1')
    }

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data)
        const bb = new flatbuffers.ByteBuffer(buf)
        const l2Update = L2Update.getRootAsL2Update(bb)
        const side = l2Update.side(); const p = l2Update.p(); const q = l2Update.q()
        if (side === Side.None) { setBids(new Map()); setAsks(new Map()); return }
        if (side === Side.Buy) {
          setBids(prev => { const next = new Map(prev); if (q === BigInt(0)) next.delete(p); else next.set(p, q); return next })
        } else if (side === Side.Sell) {
          setAsks(prev => { const next = new Map(prev); if (q === BigInt(0)) next.delete(p); else next.set(p, q); return next })
        }
      } catch (err) { addL2Log(`Decode Error: ${err}`) }
    }
    ws.onclose = (e) => { addL2Log(`Disconnected (Code: ${e.code})`); setConnected(prev => ({ ...prev, l2: false })); l2WsRef.current = null }
    ws.onerror = () => addL2Log(`WebSocket Error`)
  }

  const sendOrder = async (side: Side) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) {
      addMgmtLog(`Error: Management WS not connected`); return
    }
    const builder = new flatbuffers.Builder(1024)
    const qVal = BigInt(quantity); const execId = nextExecId.current++
    inflightOrdersRef.current.set(execId.toString(), { side, symbolId: parseInt(symbolId) })
    OrderRequest.startOrderRequest(builder)
    OrderRequest.addAction(builder, OrderAction.New)
    OrderRequest.addExecId(builder, execId)
    OrderRequest.addOrderId(builder, BigInt(0))
    OrderRequest.addClientId(builder, parseInt(clientId))
    OrderRequest.addSymbolId(builder, parseInt(symbolId))
    OrderRequest.addSide(builder, side)
    OrderRequest.addType(builder, OrderType.Limit)
    OrderRequest.addP(builder, BigInt(price))
    OrderRequest.addQ(builder, qVal)
    OrderRequest.addVisibleQty(builder, qVal)
    OrderRequest.addTimestamp(builder, BigInt(Date.now()))
    const off = OrderRequest.endOrderRequest(builder)
    ClientRequest.startClientRequest(builder)
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest)
    ClientRequest.addData(builder, off)
    builder.finish(ClientRequest.endClientRequest(builder))
    try {
      addMgmtLog(`Sending ${Side[side]} order: P=${price} Q=${quantity} ExecID=${execId}`)
      mgmtWsRef.current.send(builder.asUint8Array())
    } catch (err) { addMgmtLog(`Order send error: ${err}`) }
  }

  const cancelOrder = (order: OrderData) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) return
    const builder = new flatbuffers.Builder(1024)
    const execId = nextExecId.current++
    OrderRequest.startOrderRequest(builder)
    OrderRequest.addAction(builder, OrderAction.Cancel)
    OrderRequest.addExecId(builder, execId)
    OrderRequest.addOrderId(builder, BigInt(order.orderId))
    OrderRequest.addClientId(builder, parseInt(clientId))
    OrderRequest.addSymbolId(builder, order.symbolId)
    OrderRequest.addSide(builder, order.side)
    OrderRequest.addTimestamp(builder, BigInt(Date.now()))
    const off = OrderRequest.endOrderRequest(builder)
    ClientRequest.startClientRequest(builder)
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest)
    ClientRequest.addData(builder, off)
    builder.finish(ClientRequest.endClientRequest(builder))
    addMgmtLog(`Cancelling Order: ID=${order.orderId} ExecID=${execId}`)
    mgmtWsRef.current.send(builder.asUint8Array())
  }

  const modifyOrder = (order: OrderData) => {
    const newQty = modQty[order.orderId] || order.q.toString()
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) return
    const builder = new flatbuffers.Builder(1024)
    const execId = nextExecId.current++
    OrderRequest.startOrderRequest(builder)
    OrderRequest.addAction(builder, OrderAction.Modify)
    OrderRequest.addExecId(builder, execId)
    OrderRequest.addOrderId(builder, BigInt(order.orderId))
    OrderRequest.addClientId(builder, parseInt(clientId))
    OrderRequest.addSymbolId(builder, order.symbolId)
    OrderRequest.addSide(builder, order.side)
    OrderRequest.addP(builder, order.p)
    OrderRequest.addQ(builder, BigInt(newQty))
    OrderRequest.addTimestamp(builder, BigInt(Date.now()))
    const off = OrderRequest.endOrderRequest(builder)
    ClientRequest.startClientRequest(builder)
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest)
    ClientRequest.addData(builder, off)
    builder.finish(ClientRequest.endClientRequest(builder))
    addMgmtLog(`Modifying Order: ID=${order.orderId} NewQ=${newQty} ExecID=${execId}`)
    mgmtWsRef.current.send(builder.asUint8Array())
  }

  const sortedAsks = useMemo(() => Array.from(asks.entries()).map(([p, q]) => ({ price: p, quantity: q })).sort((a, b) => (a.price > b.price ? -1 : 1)), [asks])
  const sortedBids = useMemo(() => Array.from(bids.entries()).map(([p, q]) => ({ price: p, quantity: q })).sort((a, b) => (a.price > b.price ? -1 : 1)), [bids])

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontSize: '11px', textAlign: 'left', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: '#569cd6', margin: 0, fontSize: '16px' }}>Exchange Monitor</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span>Client ID:</span>
            <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '40px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '2px 4px', fontSize: '11px' }} />
            <button onClick={connectMgmt} style={{ backgroundColor: connected.mgmt ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>{connected.mgmt ? 'Reconnect Mgmt' : 'Connect Mgmt'}</button>
            <button onClick={connectL2} style={{ backgroundColor: connected.l2 ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>{connected.l2 ? 'Reconnect L2' : 'Connect L2'}</button>
            <button onClick={() => { mgmtWsRef.current?.close(); l2WsRef.current?.close(); }} style={{ backgroundColor: '#5a2727', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>Disconnect All</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowMgmtLogs(!showMgmtLogs)} style={{ backgroundColor: '#444', color: '#fff', border: '1px solid #555', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>{showMgmtLogs ? 'Hide Mgmt Logs' : 'Mgmt Logs'}</button>
          <button onClick={() => setShowL2Logs(!showL2Logs)} style={{ backgroundColor: '#444', color: '#fff', border: '1px solid #555', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>{showL2Logs ? 'Hide L2 Logs' : 'L2 Logs'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
          <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>L2 Orderbook</h2>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ color: '#888', textAlign: 'right' }}><th style={{ textAlign: 'left' }}>Side</th><th>Price</th><th>Size</th></tr></thead>
              <tbody>
                {sortedAsks.map((level, i) => (<tr key={`ask-${i}`} style={{ color: '#f44747', textAlign: 'right' }}><td style={{ textAlign: 'left' }}>ASK</td><td>{level.price.toString()}</td><td>{level.quantity.toString()}</td></tr>))}
                <tr style={{ height: '10px' }}><td colSpan={3}></td></tr>
                {sortedBids.map((level, i) => (<tr key={`bid-${i}`} style={{ color: '#4ec9b0', textAlign: 'right' }}><td style={{ textAlign: 'left' }}>BID</td><td>{level.price.toString()}</td><td>{level.quantity.toString()}</td></tr>))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
            <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Order Entry</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
              <div><div style={{ marginBottom: '4px' }}>Symbol</div><input type="text" value={symbolId} onChange={e => setSymbolId(e.target.value)} style={{ width: '40px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} /></div>
              <div><div style={{ marginBottom: '4px' }}>Price</div><input type="text" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} /></div>
              <div><div style={{ marginBottom: '4px' }}>Quantity</div><input type="text" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} /></div>
              <button onClick={() => sendOrder(Side.Buy)} style={{ backgroundColor: '#2d5a27', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}>Buy</button>
              <button onClick={() => sendOrder(Side.Sell)} style={{ backgroundColor: '#5a2727', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}>Sell</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
              <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Open Orders</h2>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}><th>ID</th><th>Side</th><th>Price</th><th>Qty</th><th>Filled</th><th>New Qty</th><th>Actions</th></tr></thead>
                  <tbody>
                    {Array.from(openOrders.entries()).map(([id, o]) => (
                      <tr key={id} style={{ borderBottom: '1px solid #111' }}>
                        <td>{id}</td><td style={{ color: o.side === Side.Buy ? '#4ec9b0' : o.side === Side.Sell ? '#f44747' : '#888' }}>{Side[o.side]}</td><td>{o.p.toString()}</td><td>{o.q.toString()}</td><td>{o.filled.toString()}</td>
                        <td><input type="text" value={modQty[id] || ''} placeholder={o.q.toString()} onChange={e => setModQty(prev => ({ ...prev, [id]: e.target.value }))} style={{ width: '40px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '2px' }} /></td>
                        <td>
                          <button onClick={() => modifyOrder(o)} style={{ backgroundColor: '#3e3e3e', color: '#fff', border: 'none', padding: '2px 6px', marginRight: '5px', cursor: 'pointer' }}>Mod</button>
                          <button onClick={() => cancelOrder(o)} style={{ backgroundColor: '#5a2727', color: '#fff', border: 'none', padding: '2px 6px', cursor: 'pointer' }}>Can</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
              <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Positions</h2>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}><th>Sym</th><th>Pos</th></tr></thead>
                  <tbody>
                    {Array.from(positions.entries()).map(([sId, pos]) => (
                      <tr key={sId} style={{ borderBottom: '1px solid #111' }}><td>{sId}</td><td style={{ color: pos > 0n ? '#4ec9b0' : pos < 0n ? '#f44747' : '#d4d4d4' }}>{pos.toString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMgmtLogs && (
        <div style={{ position: 'fixed', bottom: '60px', right: '20px', width: '400px', height: '300px', backgroundColor: '#000', border: '1px solid #555', borderRadius: '4px', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '5px 10px', backgroundColor: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Management Logs</span><button onClick={() => setShowMgmtLogs(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button></div>
          <div ref={mgmtLogRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>{mgmtMessages.map((msg, i) => <div key={i} style={{ marginBottom: '2px', whiteSpace: 'pre-wrap', color: '#b5cea8' }}>{msg}</div>)}</div>
        </div>
      )}
      {showL2Logs && (
        <div style={{ position: 'fixed', bottom: '60px', left: '20px', width: '400px', height: '300px', backgroundColor: '#000', border: '1px solid #555', borderRadius: '4px', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '5px 10px', backgroundColor: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>L2 Logs</span><button onClick={() => setShowL2Logs(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button></div>
          <div ref={l2LogRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>{l2Messages.map((msg, i) => <div key={i} style={{ marginBottom: '2px', whiteSpace: 'pre-wrap', color: '#ce9178' }}>{msg}</div>)}</div>
        </div>
      )}
    </div>
  )
}
export default App
