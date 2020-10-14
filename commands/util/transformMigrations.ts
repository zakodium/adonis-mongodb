import { basename } from 'path';

import { Logger } from '@poppinss/fancy-logs';

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
    .sort((a, b) => basename(a, '.js').localeCompare(basename(b, '.js')))
    .map((migrationFile) => ({
      name: basename(migrationFile, '.js'),
      file: migrationFile,
    }));

  // Check migration file names
  let hadBadName = false;
  migrations.forEach(({ name, file }) => {
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
  });
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
