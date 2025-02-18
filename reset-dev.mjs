#!/usr/bin/env node

/* eslint-env node */
import childProcess from 'node:child_process';

try {
  childProcess.execFileSync(
    'docker',
    [
      'compose',
      'exec',
      // Do not try to allocate a TTY so it works in GitHub actions too.
      '-T',
      'mongodb',
      'mongosh',
      '127.0.0.1:33333',
      '--eval',
      'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:33333" }] });',
    ],
    {
      stdio: 'inherit',
    },
  );
} catch {
  // Ignore error, it is already piped to the console.
  process.exit(1);
}
