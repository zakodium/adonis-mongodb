import * as crypto from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { getConnection, getLogger } from '../../test-utils/TestUtils';

const logger = getLogger();
const connection = getConnection(logger);

afterAll(async () => {
  await connection.disconnect();
});

test('try to connect with good config', async () => {
  await connection.connect();
  await sleep(500);
  expect(logger.logs.at(-1)).toBeUndefined();
});

test('get collection', async () => {
  const collection = await connection.collection('test');
  expect(collection).toBeDefined();
});

test('reconnect automatically', async () => {
  let collection = await connection.collection('test');
  await collection.find({}).toArray();
  await connection.disconnect();
  collection = await connection.collection('test');
  // Should connect automatically
  await collection.find({}).toArray();
});

test('get database', async () => {
  const db = await connection.database();
  expect(db).toBeDefined();
});

describe('transactions', () => {
  const id = crypto.randomUUID();
  beforeEach(async () => {
    const Test = await connection.collection('test');
    await Test.deleteMany({});
    await Test.insertOne({ id });
  });

  test('commit event', async () => {
    const txCommitController = promiseWithResolvers<number | null>();

    const [txResult, count] = await Promise.all([
      connection.transaction(async (session, db, tx) => {
        await db.collection('test').findOneAndDelete({ id }, { session });

        tx.on('commit', (session, db) => {
          expect(session.transaction.isCommitted).toBe(true);

          let count: number | null = null;
          db.collection('test')
            .countDocuments({})
            .then((_count) => {
              count = _count;
            })
            // eslint-disable-next-line no-console
            .catch(console.error)
            .finally(() => txCommitController.resolve(count));
        });

        return true;
      }),
      txCommitController.promise,
    ]);

    expect(txResult).toBe(true);
    expect(count).toBe(0);
  });

  test('abort manual event', async () => {
    const txAbortController = promiseWithResolvers<number | null>();

    const [txResult, count] = await Promise.all([
      connection.transaction(async (session, db, tx) => {
        await db.collection('test').deleteOne({ id }, { session });
        await session.abortTransaction();

        tx.on('abort', (session, db) => {
          expect(Reflect.get(session.transaction, 'state')).toBe(
            'TRANSACTION_ABORTED',
          );

          let count: number | null = null;
          db.collection('test')
            .countDocuments({})
            .then((_count) => {
              count = _count;
            })
            // eslint-disable-next-line no-console
            .catch(console.error)
            .finally(() => txAbortController.resolve(count));
        });

        return 'aborted';
      }),
      txAbortController.promise,
    ]);

    expect(txResult).toBe('aborted');
    expect(count).toBe(1);
  });

  test('abort error event', async () => {
    const txAbortController = promiseWithResolvers<number | null>();
    const error = new Error('Unexpected error');

    const [txResult, count] = await Promise.allSettled([
      connection.transaction(async (session, db, tx) => {
        await db.collection('test').deleteOne({ id }, { session });

        tx.on('abort', (session, db, err) => {
          expect(Reflect.get(session.transaction, 'state')).toBe(
            'TRANSACTION_ABORTED',
          );
          expect(err).toBe(error);

          let count: number | null = null;
          db.collection('test')
            .countDocuments({})
            .then((_count) => {
              count = _count;
            })
            // eslint-disable-next-line no-console
            .catch(console.error)
            .finally(() => txAbortController.resolve(count));
        });

        throw error;
      }),
      txAbortController.promise,
    ]);

    expect(txResult.status).toBe('rejected');
    expect(count.status === 'fulfilled' && count.value).toBe(1);
  });
});

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers#browser_compatibility
 * TODO: use ES api when this project target Node.js >=v22
 */
function promiseWithResolvers<R>() {
  let resolve: (value: R | PromiseLike<R>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reject: (reason: any) => void;
  const promise = new Promise<R>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    // @ts-expect-error The Promise executor is synchronous
    resolve,
    // @ts-expect-error The Promise executor is synchronous
    reject,
    promise,
  };
}
