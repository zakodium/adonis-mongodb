import transformMigrations from '../transformMigrations';

const okMigrations = [
  ['mongodb/migrations/1_test.js', 'mongodb/migrations/2_test.js'],
  ['mongodb/alternative/3_test.js', 'mongodb/alternative/4_test.js'],
];

test('migration transform ok when everything is ok', () => {
  expect(transformMigrations(okMigrations)).toStrictEqual([
    { name: '1_test', file: 'mongodb/migrations/1_test.js' },
    { name: '2_test', file: 'mongodb/migrations/2_test.js' },
    { name: '3_test', file: 'mongodb/alternative/3_test.js' },
    { name: '4_test', file: 'mongodb/alternative/4_test.js' },
  ]);
});

test('throws if missing timestamp in migration file name', () => {
  const badMigrations = [...okMigrations];
  badMigrations[0][0] = 'mongodb/migration/test.js';

  const t = () => {
    transformMigrations(badMigrations);
  };
  expect(t).toThrow('some migration files are malformed');
});

test('throws if migration filename are duplicate', () => {
  const badMigrations = [...okMigrations];
  badMigrations[0][0] = badMigrations[1][0];

  const t = () => {
    transformMigrations(badMigrations);
  };
  expect(t).toThrow('found duplicate migration file names: 3_test');
});
