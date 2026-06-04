import { useState, useRef, useCallback, useEffect } from 'react';
import * as flatbuffers from 'flatbuffers';
import { L2Update } from '../fbs/exchange/l2-update';
import { ClientResponse } from '../fbs/exchange/client-response';
import { ClientResponseData } from '../fbs/exchange/client-response-data';
import { Side } from '../fbs/exchange/side';
import { ExecType } from '../fbs/exchange/exec-type';
import { OrderResponse } from '../fbs/exchange/order-response';
import { PositionResponse } from '../fbs/exchange/position-response';
import { OrderRequest } from '../fbs/exchange/order-request';
import { OrderAction } from '../fbs/exchange/order-action';
import { OrderType } from '../fbs/exchange/order-type';
import { ClientRequest } from '../fbs/exchange/client-request';
import { ClientRequestData as ClientReqData } from '../fbs/exchange/client-request-data';
import { PositionRequest } from '../fbs/exchange/position-request';
import type { OrderData, ConnectedState } from '../types';

export function useExchange() {
  const [connected, setConnected] = useState<ConnectedState>({ mgmt: false, mgmtReady: false, l2: false });
  const [bids, setBids] = useState<Map<bigint, bigint>>(new Map());
  const [asks, setAsks] = useState<Map<bigint, bigint>>(new Map());
  const [openOrders, setOpenOrders] = useState<Map<string, OrderData>>(new Map());
  const [positions, setPositions] = useState<Map<number, bigint>>(new Map());

  const inflightOrdersRef = useRef<Map<string, { side: Side, symbolId: number }>>(new Map());
  const orderMetadataRef = useRef<Map<string, { side: Side, symbolId: number }>>(new Map());
  const nextExecId = useRef(BigInt(Date.now()));
  const nextOrderId = useRef(BigInt(Date.now()) * 1000n);

  const [mgmtMessages, setMgmtMessages] = useState<string[]>([]);
  const [l2Messages, setL2Messages] = useState<string[]>([]);

  const mgmtWsRef = useRef<WebSocket | null>(null);
  const l2WsRef = useRef<WebSocket | null>(null);
  const l2RetryTimeoutRef = useRef<number | null>(null);

  const addMgmtLog = useCallback((msg: string) => {
    setMgmtMessages(prev => [...prev, `${new Date().toLocaleTimeString('en-US')} - ${msg}`].slice(-200));
  }, []);

  const addL2Log = useCallback((msg: string) => {
    setL2Messages(prev => [...prev, `${new Date().toLocaleTimeString('en-US')} - ${msg}`].slice(-200));
  }, []);

  const handleOrderResponse = useCallback((resp: OrderResponse) => {
    const execType = resp.execType();
    const orderId = resp.orderId().toString();
    const execId = resp.execId().toString();
    const q = resp.q();
    const p = resp.p();
    const sId = resp.symbolId();
    const side = resp.side();
    const rejectCode = resp.rejectCode();

    if (execType === ExecType.Complete) {
      setConnected(prev => ({ ...prev, mgmtReady: true }));
      addMgmtLog('[System] Management session ready');
      return;
    }
    
    const execName = ExecType[execType] ?? `Unknown(${execType})`;
    addMgmtLog(`[Exec] ID=${orderId} Type=${execName} Side=${Side[side]} P=${p} Q=${q} ExecID=${execId}`);

    if (rejectCode !== 0) {
      addMgmtLog(`[Error] Order Rejected: ID=${orderId} Code=${rejectCode}`);
      return;
    }

    if (orderId !== '0') {
      orderMetadataRef.current.set(orderId, { side, symbolId: sId });
    }

    if (execType === ExecType.New || execType === ExecType.OrderStatus) {
      setOpenOrders(prev => {
        const next = new Map(prev);
        if (!next.has(orderId)) {
          next.set(orderId, { orderId, symbolId: sId, side, p, q, filled: 0n });
        }
        return next;
      });
    } else if (execType === ExecType.Replaced) {
      setOpenOrders(prev => {
        const next = new Map(prev);
        const existing = next.get(orderId);
        next.set(orderId, { orderId, symbolId: sId, side, p, q, filled: existing ? existing.filled : 0n });
        return next;
      });
    } else if (execType === ExecType.PartialFill || execType === ExecType.Fill) {
      setOpenOrders(prev => {
        const next = new Map(prev);
        const existing = next.get(orderId);
        const order = existing 
          ? { ...existing, filled: existing.filled + q }
          : { orderId, symbolId: sId, side, p, q: 0n, filled: q };
          
        if (execType === ExecType.Fill) {
          next.delete(orderId);
        } else {
          next.set(orderId, order);
        }
        return next;
      });

      if (side !== Side.None) {
        const fillQty = side === Side.Buy ? q : -q;
        const cashQty = -(fillQty * p);
        setPositions(pPrev => {
          const pNext = new Map(pPrev);
          // Update Traded Symbol
          const currentSym = pNext.get(sId) || 0n;
          pNext.set(sId, currentSym + fillQty);
          // Update CASH (Symbol 0)
          const currentCash = pNext.get(0) || 0n;
          pNext.set(0, currentCash + cashQty);
          return pNext;
        });
      }
    } else if (execType === ExecType.Cancelled) {
      setOpenOrders(prev => {
        const next = new Map(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, [addMgmtLog]);

  const connectMgmt = useCallback((clientId: string, symbolId: string) => {
    if (mgmtWsRef.current) mgmtWsRef.current.close();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws-mgmt`;
    addMgmtLog(`Connecting to Management WS (9001) ClientID=${clientId}...`);
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    mgmtWsRef.current = ws;

    ws.onopen = () => {
      setOpenOrders(new Map());
      setPositions(new Map());
      addMgmtLog(`Connected ClientID=${clientId}`);
      setConnected(prev => ({ ...prev, mgmt: true }));
      ws.send(`sub ${clientId}`);
      
      const sendPositionReq = (sId: number) => {
        const builder = new flatbuffers.Builder(1024);
        PositionRequest.startPositionRequest(builder);
        PositionRequest.addClientId(builder, parseInt(clientId));
        PositionRequest.addSymbolId(builder, sId);
        const offset = PositionRequest.endPositionRequest(builder);
        ClientRequest.startClientRequest(builder);
        ClientRequest.addDataType(builder, ClientReqData.PositionRequest);
        ClientRequest.addData(builder, offset);
        builder.finish(ClientRequest.endClientRequest(builder));
        ws.send(builder.asUint8Array() as any);
      };

      // Request for CASH (0) and Traded Symbol (symbolId)
      // sendPositionReq(0);
      // sendPositionReq(parseInt(symbolId));
    };

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data);
        const bb = new flatbuffers.ByteBuffer(buf);
        const response = ClientResponse.getRootAsClientResponse(bb);
        const dataType = response.dataType();
        if (dataType === ClientResponseData.OrderResponse) {
          const orderResp = response.data(new OrderResponse()) as OrderResponse;
          if (orderResp) handleOrderResponse(orderResp);
        } else if (dataType === ClientResponseData.PositionResponse) {
          const posResp = response.data(new PositionResponse()) as PositionResponse;
          if (posResp) {
            setPositions(prev => {
              const next = new Map(prev);
              next.set(posResp.symbolId(), posResp.position());
              return next;
            });
            addMgmtLog(`Position Sync: Sym=${posResp.symbolId()} Qty=${posResp.position()}`);
          }
        }
      } catch (err) { addMgmtLog(`Decode Error: ${err}`); }
    };
    ws.onclose = (e) => { addMgmtLog(`Disconnected (Code: ${e.code})`); setConnected(prev => ({ ...prev, mgmt: false, mgmtReady: false })); mgmtWsRef.current = null; };
    ws.onerror = () => addMgmtLog(`WebSocket Error`);
  }, [addMgmtLog, handleOrderResponse]);

  const connectL2 = useCallback(() => {
    if (l2RetryTimeoutRef.current) {
      clearTimeout(l2RetryTimeoutRef.current);
      l2RetryTimeoutRef.current = null;
    }
    if (l2WsRef.current) l2WsRef.current.close();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws-l2`;
    addL2Log(`Connecting to L2 WS (9002)...`);
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    l2WsRef.current = ws;

    ws.onopen = () => {
      setOpenOrders(new Map());
      setPositions(new Map());
      addL2Log('Connected');
      setConnected(prev => ({ ...prev, l2: true }));
      ws.send('sub 1');
    };

    ws.onmessage = (event) => {
      try {
        const buf = new Uint8Array(event.data);
        const bb = new flatbuffers.ByteBuffer(buf);
        const l2Update = L2Update.getRootAsL2Update(bb);
        const side = l2Update.side(); const p = l2Update.p(); const q = l2Update.q();
        if (side === Side.None) { setBids(new Map()); setAsks(new Map()); return; }
        if (side === Side.Buy) {
          setBids(prev => { const next = new Map(prev); if (q === BigInt(0)) next.delete(p); else next.set(p, q); return next; });
        } else if (side === Side.Sell) {
          setAsks(prev => { const next = new Map(prev); if (q === BigInt(0)) next.delete(p); else next.set(p, q); return next; });
        }
      } catch (err) { addL2Log(`Decode Error: ${err}`); }
    };
    ws.onclose = (e) => { 
      addL2Log(`Disconnected (Code: ${e.code}). Retrying in 2s...`); 
      setConnected(prev => ({ ...prev, l2: false })); 
      l2WsRef.current = null; 
      l2RetryTimeoutRef.current = window.setTimeout(connectL2, 2000);
    };
    ws.onerror = () => addL2Log(`WebSocket Error`);
  }, [addL2Log]);

  useEffect(() => {
    connectL2();
    return () => {
      if (l2WsRef.current) l2WsRef.current.close();
      if (l2RetryTimeoutRef.current) clearTimeout(l2RetryTimeoutRef.current);
    };
  }, [connectL2]);

  const disconnectAll = useCallback(() => {
    mgmtWsRef.current?.close();
    l2WsRef.current?.close();
    if (l2RetryTimeoutRef.current) {
      clearTimeout(l2RetryTimeoutRef.current);
      l2RetryTimeoutRef.current = null;
    }
  }, []);

  const sendOrder = useCallback(async (side: Side, clientId: string, symbolId: string, price: string, quantity: string) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) {
      addMgmtLog(`Error: Management WS not connected`); return;
    }
    const builder = new flatbuffers.Builder(1024);
    const qVal = BigInt(quantity); const execId = nextExecId.current++;
    const orderId = nextOrderId.current++;
    inflightOrdersRef.current.set(execId.toString(), { side, symbolId: parseInt(symbolId) });
    OrderRequest.startOrderRequest(builder);
    OrderRequest.addAction(builder, OrderAction.New);
    OrderRequest.addExecId(builder, execId);
    OrderRequest.addOrderId(builder, orderId);
    OrderRequest.addClientId(builder, parseInt(clientId));
    OrderRequest.addSymbolId(builder, parseInt(symbolId));
    OrderRequest.addSide(builder, side);
    OrderRequest.addType(builder, OrderType.Limit);
    OrderRequest.addP(builder, BigInt(price));
    OrderRequest.addQ(builder, qVal);
    OrderRequest.addVisibleQty(builder, qVal);
    OrderRequest.addTimestamp(builder, BigInt(Date.now()));
    const off = OrderRequest.endOrderRequest(builder);
    ClientRequest.startClientRequest(builder);
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest);
    ClientRequest.addData(builder, off);
    builder.finish(ClientRequest.endClientRequest(builder));
    try {
      addMgmtLog(`Sending ${Side[side]} order: ClientID=${clientId} P=${price} Q=${quantity} ID=${orderId} ExecID=${execId}`);
      mgmtWsRef.current.send(builder.asUint8Array() as any);
    } catch (err) { addMgmtLog(`Order send error: ${err}`); }
  }, [addMgmtLog]);

  const cancelOrder = useCallback((order: OrderData, clientId: string) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) return;
    const builder = new flatbuffers.Builder(1024);
    const execId = nextExecId.current++;
    OrderRequest.startOrderRequest(builder);
    OrderRequest.addAction(builder, OrderAction.Cancel);
    OrderRequest.addExecId(builder, execId);
    OrderRequest.addOrderId(builder, BigInt(order.orderId));
    OrderRequest.addClientId(builder, parseInt(clientId));
    OrderRequest.addSymbolId(builder, order.symbolId);
    OrderRequest.addSide(builder, order.side);
    OrderRequest.addTimestamp(builder, BigInt(Date.now()));
    const off = OrderRequest.endOrderRequest(builder);
    ClientRequest.startClientRequest(builder);
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest);
    ClientRequest.addData(builder, off);
    builder.finish(ClientRequest.endClientRequest(builder));
    addMgmtLog(`Cancelling Order: ClientID=${clientId} ID=${order.orderId} ExecID=${execId}`)
    mgmtWsRef.current.send(builder.asUint8Array() as any)
  }, [addMgmtLog]);

  const modifyOrder = useCallback((order: OrderData, clientId: string, newQty: string) => {
    if (!mgmtWsRef.current || mgmtWsRef.current.readyState !== WebSocket.OPEN) return;
    const builder = new flatbuffers.Builder(1024);
    const execId = nextExecId.current++;
    OrderRequest.startOrderRequest(builder);
    OrderRequest.addAction(builder, OrderAction.Modify);
    OrderRequest.addExecId(builder, execId);
    OrderRequest.addOrderId(builder, BigInt(order.orderId));
    OrderRequest.addClientId(builder, parseInt(clientId));
    OrderRequest.addSymbolId(builder, order.symbolId);
    OrderRequest.addSide(builder, order.side);
    OrderRequest.addP(builder, order.p);
    OrderRequest.addQ(builder, BigInt(newQty));
    OrderRequest.addTimestamp(builder, BigInt(Date.now()));
    const off = OrderRequest.endOrderRequest(builder);
    ClientRequest.startClientRequest(builder);
    ClientRequest.addDataType(builder, ClientReqData.OrderRequest);
    ClientRequest.addData(builder, off);
    builder.finish(ClientRequest.endClientRequest(builder));
    addMgmtLog(`Modifying Order: ClientID=${clientId} ID=${order.orderId} NewQ=${newQty} ExecID=${execId}`)
    mgmtWsRef.current.send(builder.asUint8Array() as any)
  }, [addMgmtLog]);

  return {
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
  };
}
