import { EventEmitter } from 'node:events';

import { ClientSession, Db } from 'mongodb';

export interface TransactionEvents {
  commit: [session: ClientSession, db: Db];
  abort: [session: ClientSession, db: Db, error?: Error];
}

export class TransactionEventEmitter extends EventEmitter<TransactionEvents> {}
