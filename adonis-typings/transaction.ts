declare module '@ioc:Zakodium/Mongodb/Database/Transaction' {
  import { EventEmitter } from 'node:events';

  export interface TransactionEvents {
    /**
     * The transaction commits successfully.
     *
     * @example
     * Consider you have a collection of items storing metadata of files from the filesystem.
     * Consider when you delete an item from this collection, you must delete the associated file.
     *
     * ```ts
     * const item = await connection.transaction((session, db, tx) => {
     *   const item = await db.collection('test').findOneAndDelete({ _id }, { session });
     *
     *   tx.on('commit', () => {
     *     Drive.delete(deletedItem.file.path);
     *   });
     *
     *   // some other logic that could fail
     *   // or await session.abortTransaction()
     *   // commit will not emit in this case
     *
     *   return item;
     * })
     * ```
     */
    commit: [];

    /**
     * The transaction aborted (optional error).
     * Two cases of abortion are possible:
     * - if from `session.abortTransaction()`, no error
     * - if from a throw, error is set
     */
    abort: [error?: Error];
  }

  export class TransactionEventEmitter extends EventEmitter<TransactionEvents> {}
}
