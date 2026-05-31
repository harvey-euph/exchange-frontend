import { Side } from './fbs/exchange/side';

export interface OrderData {
  orderId: string;
  symbolId: number;
  side: Side;
  p: bigint;
  q: bigint;
  filled: bigint;
}

export interface ConnectedState {
  mgmt: boolean;
  l2: boolean;
}
