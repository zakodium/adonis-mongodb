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
      'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })',
    ],
    {
      // Set COMPOSE_INTERACTIVE_NO_CLI, otherwise Compose tries to allocate a TTY when it cannot in GitHub actions.
      env: { ...process.env, COMPOSE_INTERACTIVE_NO_CLI: 'true' },
      stdio: 'inherit',
    },
  );
} catch (e) {
  process.stderr.write(e.stderr);
  process.exit(1);
}
