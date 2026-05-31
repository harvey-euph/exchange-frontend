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
import './App.css'

function App() {
  const [messages, setMessages] = useState<string[]>([])
  const [clientId, setClientId] = useState('101')
  const [connected, setConnected] = useState({ mgmt: false, l2: false })
  
  // Orderbook state
  const [bids, setBids] = useState<Map<bigint, bigint>>(new Map())
  const [asks, setAsks] = useState<Map<bigint, bigint>>(new Map())
  
  // Order Entry state
  const [symbolId, setSymbolId] = useState('1')
  const [price, setPrice] = useState('100')
  const [quantity, setQuantity] = useState('10')

  const logRef = useRef<HTMLDivElement>(null)
  const mgmtWsRef = useRef<WebSocket | null>(null)
  const l2WsRef = useRef<WebSocket | null>(null)

  const addLog = (msg: string) => {
    setMessages((prev) => {
      const newLogs = [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]
      return newLogs.slice(-200)
    })
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages])

  const connectMgmt = () => {
    if (mgmtWsRef.current) mgmtWsRef.current.close()
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws-mgmt`
    
    addLog(`[Client] Connecting via proxy to 9001...`)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    mgmtWsRef.current = ws

    ws.onopen = () => {
      addLog('[Client] Connected')
      setConnected(prev => ({ ...prev, mgmt: true }))
      ws.send(`sub ${clientId}`)
      addLog(`[Client] Sent: sub ${clientId}`)
    }

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data)
        const bb = new flatbuffers.ByteBuffer(buf)
        const response = ClientResponse.getRootAsClientResponse(bb)
        
        const dataType = response.dataType()
        if (dataType === ClientResponseData.OrderResponse) {
          const orderResp = response.data(new OrderResponse()) as OrderResponse
          if (orderResp) {
            const execValue = orderResp.execType()
            const execName = ExecType[execValue] ?? `Unknown(${execValue})`
            addLog(`[Client] Execution: ID=${orderResp.orderId()} Type=${execName} P=${orderResp.p()} Q=${orderResp.q()}`)
          }
        } else if (dataType === ClientResponseData.PositionResponse) {
          const posResp = response.data(new PositionResponse()) as PositionResponse
          if (posResp) {
            addLog(`[Client] Position: Sym=${posResp.symbolId()} Qty=${posResp.position()}`)
          }
        }
      } catch (err) {
        addLog(`[Client] Decode Error: ${err}`)
      }
    }

    ws.onclose = (e) => {
      addLog(`[Client] Disconnected (Code: ${e.code})`)
      setConnected(prev => ({ ...prev, mgmt: false }))
      mgmtWsRef.current = null
    }

    ws.onerror = () => addLog(`[Client] WebSocket Error`)
  }

  const connectL2 = () => {
    if (l2WsRef.current) l2WsRef.current.close()
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws-l2`
    
    addLog(`[L2] Connecting via proxy to 9002...`)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    l2WsRef.current = ws

    ws.onopen = () => {
      addLog('[L2] Connected')
      setConnected(prev => ({ ...prev, l2: true }))
      ws.send('sub 1')
    }

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data)
        const bb = new flatbuffers.ByteBuffer(buf)
        const l2Update = L2Update.getRootAsL2Update(bb)
        
        const side = l2Update.side()
        const p = l2Update.p()
        const q = l2Update.q()

        if (side === Side.None) {
          // Empty frame ahead, reset orderbook
          setBids(new Map())
          setAsks(new Map())
          return
        }

        if (side === Side.Buy) {
          setBids(prev => {
            const next = new Map(prev)
            if (q === BigInt(0)) next.delete(p)
            else next.set(p, q)
            return next
          })
        } else if (side === Side.Sell) {
          setAsks(prev => {
            const next = new Map(prev)
            if (q === BigInt(0)) next.delete(p)
            else next.set(p, q)
            return next
          })
        }
      } catch (err) {
        addLog(`[L2] Decode Error: ${err}`)
      }
    }

    ws.onclose = (e) => {
      addLog(`[L2] Disconnected (Code: ${e.code})`)
      setConnected(prev => ({ ...prev, l2: false }))
      l2WsRef.current = null
    }

    ws.onerror = () => addLog(`[L2] WebSocket Error`)
  }

  const sendOrder = async (side: Side) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) {
      addLog(`[Client] Error: Mgmt WebSocket not connected`)
      return
    }

    const builder = new flatbuffers.Builder(1024)
    const qVal = BigInt(quantity)
    
    OrderRequest.startOrderRequest(builder)
    OrderRequest.addAction(builder, OrderAction.New)
    OrderRequest.addExecId(builder, BigInt(0))
    OrderRequest.addOrderId(builder, BigInt(0))
    OrderRequest.addClientId(builder, parseInt(clientId))
    OrderRequest.addSymbolId(builder, parseInt(symbolId))
    OrderRequest.addSide(builder, side)
    OrderRequest.addType(builder, OrderType.Limit)
    OrderRequest.addP(builder, BigInt(price))
    OrderRequest.addQ(builder, qVal)
    OrderRequest.addVisibleQty(builder, qVal)
    OrderRequest.addTimestamp(builder, BigInt(Date.now()))
    const orderRequestOffset = OrderRequest.endOrderRequest(builder)

    ClientRequest.startClientRequest(builder)
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest)
    ClientRequest.addData(builder, orderRequestOffset)
    const clientRequestOffset = ClientRequest.endClientRequest(builder)
    builder.finish(clientRequestOffset)
    
    const bytes = builder.asUint8Array()
    
    try {
      addLog(`[Client] Sending ${Side[side]} order via WS: P=${price} Q=${quantity}`)
      mgmtWsRef.current.send(bytes)
      addLog(`[Client] Order sent to Management WS`)
    } catch (err) {
      addLog(`[Client] Order send error: ${err}`)
    }
  }

  const disconnectAll = () => {
    mgmtWsRef.current?.close()
    l2WsRef.current?.close()
  }

  const sortedAsks = useMemo(() => {
    return Array.from(asks.entries())
      .map(([p, q]) => ({ price: p, quantity: q }))
      .sort((a, b) => (a.price > b.price ? -1 : 1)) // High to low
  }, [asks])

  const sortedBids = useMemo(() => {
    return Array.from(bids.entries())
      .map(([p, q]) => ({ price: p, quantity: q }))
      .sort((a, b) => (a.price > b.price ? -1 : 1)) // High to low
  }, [bids])

  return (
    <div className="App" style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#1e1e1e', 
      color: '#d4d4d4',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '11px',
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: '#569cd6', margin: 0, fontSize: '16px' }}>Exchange Monitor</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span>Client ID:</span>
            <input 
              type="text" 
              value={clientId} 
              onChange={(e) => setClientId(e.target.value)}
              style={{ width: '50px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '2px 4px', fontSize: '11px' }}
            />
            <button onClick={connectMgmt} style={{ backgroundColor: connected.mgmt ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>
              {connected.mgmt ? 'Reconnect Mgmt' : 'Connect Mgmt'}
            </button>
            <button onClick={connectL2} style={{ backgroundColor: connected.l2 ? '#2d5a27' : '#444', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>
              {connected.l2 ? 'Reconnect L2' : 'Connect L2'}
            </button>
            <button onClick={disconnectAll} style={{ backgroundColor: '#5a2727', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #555', color: '#fff' }}>Disconnect All</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Orderbook Block */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
          <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>L2 Orderbook</h2>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', textAlign: 'right' }}>
                  <th style={{ textAlign: 'left' }}>Side</th>
                  <th>Price</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {sortedAsks.map((level, i) => (
                  <tr key={`ask-${i}`} style={{ color: '#f44747', textAlign: 'right' }}>
                    <td style={{ textAlign: 'left' }}>ASK</td>
                    <td>{level.price.toString()}</td>
                    <td>{level.quantity.toString()}</td>
                  </tr>
                ))}
                <tr style={{ height: '10px' }}><td colSpan={3}></td></tr>
                {sortedBids.map((level, i) => (
                  <tr key={`bid-${i}`} style={{ color: '#4ec9b0', textAlign: 'right' }}>
                    <td style={{ textAlign: 'left' }}>BID</td>
                    <td>{level.price.toString()}</td>
                    <td>{level.quantity.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Center: Order Entry & Logs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Order Entry Block */}
          <div style={{ border: '1px solid #333', borderRadius: '4px', backgroundColor: '#000', padding: '10px' }}>
            <h2 style={{ fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Order Entry</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
              <div>
                <div style={{ marginBottom: '4px' }}>Symbol</div>
                <input type="text" value={symbolId} onChange={e => setSymbolId(e.target.value)} style={{ width: '60px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
              </div>
              <div>
                <div style={{ marginBottom: '4px' }}>Price</div>
                <input type="text" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '80px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
              </div>
              <div>
                <div style={{ marginBottom: '4px' }}>Quantity</div>
                <input type="text" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '80px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '4px' }} />
              </div>
              <button 
                onClick={() => sendOrder(Side.Buy)}
                style={{ backgroundColor: '#2d5a27', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}
              >
                Buy / Long
              </button>
              <button 
                onClick={() => sendOrder(Side.Sell)}
                style={{ backgroundColor: '#5a2727', color: '#fff', border: 'none', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' }}
              >
                Sell / Short
              </button>
            </div>
          </div>

          {/* Logs Block */}
          <div 
            ref={logRef}
            style={{ 
              flex: 1,
              overflowY: 'auto', 
              border: '1px solid #333', 
              padding: '10px',
              backgroundColor: '#000',
              borderRadius: '4px',
              textAlign: 'left'
            }}
          >
            {messages.length === 0 && <p style={{ color: '#888' }}>Not connected. Click buttons above to start.</p>}
            {messages.map((msg, i) => {
              let color = '#d4d4d4'
              if (msg.includes('[L2]')) color = '#ce9178'
              if (msg.includes('[Client]')) color = '#b5cea8'
              if (msg.includes('Error')) color = '#f44747'
              if (msg.includes('Connected')) color = '#4ec9b0'
              if (msg.includes('Sent: sub')) color = '#569cd6'
              
              return (
                <div key={i} style={{ marginBottom: '2px', color, whiteSpace: 'pre-wrap' }}>{msg}</div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
