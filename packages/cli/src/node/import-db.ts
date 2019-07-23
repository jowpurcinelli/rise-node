// tslint:disable:no-console
import { leaf, option } from '@carnesen/cli';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  BACKUPS_DIR,
  checkNodeDirExists,
  execCmd,
  extractSourceFile,
  getBackupPID,
  getBlockHeight,
  getDBEnvVars,
  getNodePID,
  hasLocalPostgres,
  removeBackupLock,
  setBackupLock,
} from '../shared/misc';
import {
  configOption,
  IConfig,
  INetwork,
  IVerbose,
  networkOption,
} from '../shared/options';
import { nodeStop } from './stop';

export type TOptions = IConfig & INetwork & { file: string } & IVerbose;

export default leaf({
  commandName: 'import-db',
  description: 'Imports a DB dump using the provided config.',

  options: {
    ...configOption,
    ...networkOption,
    file: option({
      defaultValue: path.join(BACKUPS_DIR, 'latest'),
      description: 'Path to the backup file',
      nullable: false,
      typeName: 'string',
    }),
  },

  async action({ config, network, file, verbose }: TOptions) {
    if (!(await checkConditions(config, file))) {
      return;
    }
    setBackupLock();
    const envVars = getDBEnvVars(network, config);
    const env = { ...process.env, ...envVars };
    const database = envVars.PGDATABASE;

    await nodeStop({ verbose });

    try {
      await execCmd(
        'dropdb',
        ['--if-exists', database],
        `Couldn't drop DB ${database}`,
        { env },
        verbose
      );
      await execCmd(
        'createdb',
        [database],
        `Couldn't create DB ${database}`,
        { env },
        verbose
      );
      // TODO unify with others by piping manually
      try {
        execSync(`gunzip -c "${file}" | psql > /dev/null`, {
          env,
        });
      } catch (e) {
        console.log(`Cannot import "${file}"`);
      }
      const blockHeight = await getBlockHeight(network, config, verbose);
      console.log(`Imported "./${file}" into the DB.`);
      console.log(`Block height: ${blockHeight}`);
    } catch (err) {
      if (verbose) {
        console.log(err);
      }
      console.log(
        'Error when importing the backup file. Examine the log using --verbose.'
      );
      process.exit(1);
    }
    removeBackupLock();
  },
});

async function checkConditions(config: string | null, file: string) {
  const backupPID = getBackupPID();
  if (backupPID) {
    console.log(`ERROR: Active backup with PID ${backupPID}`);
    return false;
  }
  if (!fs.existsSync(file)) {
    console.log(`ERROR: Requested file "${file}" doesn't exist`);
    return false;
  }
  if (!hasLocalPostgres()) {
    console.log('ERROR: PostgreSQL not installed');
    return false;
  }
  if (config && !fs.existsSync(config)) {
    console.log(`ERROR: Config file doesn't exist.\n${config}`);
    return false;
  }
  if (!checkNodeDirExists(true)) {
    await extractSourceFile();
  }
  // TODO use nodeStop() ?
  const nodePID = getNodePID();
  if (nodePID) {
    console.log(`Stopping RISE node with PID ${nodePID}`);
    await execCmd(
      'kill',
      [nodePID.toString()],
      "Couldn't kill the running node"
    );
  }
  return true;
}
