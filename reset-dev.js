'use strict';

const childProcess = require('child_process');

try {
  childProcess.execFileSync(
    'docker-compose',
    [
      '-f',
      'docker-compose.yml',
      'exec',
      'mongodb',
      'mongo',
      '--eval',
      'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:33333" }] })',
    ],
    {
      stdio: 'inherit',
    },
  );
} catch (e) {
  process.stderr.write(e.stderr)
  process.exit(1)
}