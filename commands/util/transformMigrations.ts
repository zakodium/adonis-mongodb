import path from 'node:path';

import { Logger } from '@poppinss/cliui/build/src/Logger';

const matchTimestamp = /^(?<timestamp>\d+)_.*$/;

export interface MigrationDescription {
  name: string;
  file: string;
}

export default function transformMigrations(
  rawMigrations: string[][],
  logger?: Logger,
) {
  // Separate name and file fields
  const migrations: MigrationDescription[] = rawMigrations
    .flat()
    .sort((a, b) =>
      path
        .basename(a, path.extname(a))
        .localeCompare(path.basename(b, path.extname(a))),
    )
    .map((migrationFile) => ({
      name: path.basename(migrationFile, path.extname(migrationFile)),
      file: migrationFile,
    }));

  // Check migration file names
  let hadBadName = false;
  for (const { name, file } of migrations) {
    const match = matchTimestamp.exec(name);
    const timestamp = Number(match?.groups?.timestamp);
    if (Number.isNaN(timestamp) || timestamp === 0) {
      hadBadName = true;
      if (logger) {
        logger.error(
          `Invalid migration file: ${file}. Name must start with a timestamp`,
        );
      }
    }
  }
  if (hadBadName) {
    throw new Error('some migration files are malformed');
  }

  // Check duplicates migration file names
  const duplicates = new Set(
    migrations.filter(
      ({ name }, index) =>
        migrations.map((migration) => migration.name).indexOf(name) !== index,
    ),
  );
  if (duplicates.size > 0) {
    throw new Error(
      `found duplicate migration file names: ${[...duplicates]
        .map(({ name }) => name)
        .join(', ')}`,
    );
  }

  return migrations;
}
