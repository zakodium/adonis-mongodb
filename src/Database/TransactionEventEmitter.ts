import { EventEmitter } from 'node:events';

export interface TransactionEvents {
  commit: [];
  abort: [error?: Error];
}

export class TransactionEventEmitter extends EventEmitter<TransactionEvents> {}
