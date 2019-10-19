// tslint:disable:no-console
import { leaf, option } from '@carnesen/cli';
import fs from 'fs';
import path from 'path';
import { LOGS_DIR } from '../../shared/constants';
import { closeLog, debug, log } from '../../shared/log';
import {
  configOption,
  IConfig,
  INetwork,
  IShell,
  IV1,
  IVerbose,
  networkOption,
  v1Option,
  verboseOption,
} from '../../shared/options';
import { nodeLogsPath } from './path';

export type TOptions = IConfig &
  INetwork &
  IVerbose &
  IV1 &
  IShell & { dir?: string };

export default leaf({
  commandName: 'archive',
  description: 'Archive the current log files',
  options: {
    ...configOption,
    ...networkOption,
    ...verboseOption,
    ...v1Option,
    dir: option({
      defaultValue: LOGS_DIR,
      description: 'Target directory',
      nullable: false,
      typeName: 'string',
    }),
  },

  async action({ verbose, network, config, v1, dir }: TOptions) {
    try {
      if (!dir) {
        dir = LOGS_DIR;
      }
      nodeLogsArchive({ network, config, v1, dir });
    } catch (err) {
      debug(err);
      if (verbose) {
        log(err);
      }
      log(
        "Error when getting the log's file path. " +
          (verbose ? '' : 'Examine the log using --verbose.')
      );
      process.exit(1);
    } finally {
      closeLog();
    }
  },
});

export function nodeLogsArchive({ network, config, v1, dir }: TOptions) {
  const shellLog = nodeLogsPath({ shell: true });
  const nodeLog = nodeLogsPath({ network, config, v1 });
  // make sure the files exists
  if (!fs.existsSync(shellLog)) {
    throw new Error(`Log file doesn't exist: ${shellLog}`);
  }
  if (!fs.existsSync(nodeLog)) {
    throw new Error(`Log file doesn't exist: ${nodeLog}`);
  }
  // rename with the current date
  const suffix = new Date().toISOString();
  const shellArchived = path.join(dir, 'shell-' + suffix);
  const nodeArchived = path.join(dir, network + '-' + suffix);
  // TODO get the name from the last part of config's "logFileName"
  log(`Archiving ${shellLog} as ${shellArchived}`);
  log(`Archiving ${nodeLog} as ${nodeArchived}`);
  fs.renameSync(shellLog, shellArchived);
  fs.renameSync(nodeLog, nodeArchived);
  log('Archiving done');
}
