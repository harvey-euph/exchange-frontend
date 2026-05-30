import { useEffect, useState, useRef } from 'react'
import * as flatbuffers from 'flatbuffers'
import { L2Update } from './fbs/exchange/l2-update'
import { ClientResponse } from './fbs/exchange/client-response'
import { ClientResponseData } from './fbs/exchange/client-response-data'
import { Side } from './fbs/exchange/side'
import { ExecType } from './fbs/exchange/exec-type'
import { OrderResponse } from './fbs/exchange/order-response'
import { PositionResponse } from './fbs/exchange/position-response'
import './App.css'

function App() {
  const [messages, setMessages] = useState<string[]>([])
  const [clientId, setClientId] = useState('101')
  const [connected, setConnected] = useState({ mgmt: false, l2: false })
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
        const sideName = Side[l2Update.side()] ?? 'Unknown'
        addLog(`[L2] Update: Sym=${l2Update.symbolId()} Seq=${l2Update.seqNum()} Side=${sideName} P=${l2Update.p()} Q=${l2Update.q()}`)
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

  const disconnectAll = () => {
    mgmtWsRef.current?.close()
    l2WsRef.current?.close()
  }

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
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
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
  )
}

export default App
