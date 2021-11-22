/* eslint-env node */
import childProcess from 'child_process';

try {
  childProcess.execFileSync(
    'docker-compose',
    [
      'exec',
      // Do not try to allocate a TTY so it works in GitHub actions too.
      '-T',
      'mongodb',
      'mongo',
      '127.0.0.1:33333',
      '--eval',
      'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:33333" }] })',
    ],
    {
      stdio: 'inherit',
    },
  );
} catch (e) {
  process.stderr.write(e.stderr);
  process.exit(1);
}
