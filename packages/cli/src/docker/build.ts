// tslint:disable:no-console
import { leaf, option } from '@carnesen/cli';
import { exec, execSync } from 'child_process';
import * as fs from 'fs';
import { DOCKER_DIR, getDockerDir, log, MIN } from '../misc';

export default leaf({
  commandName: 'build',
  description: 'Rebuilds an image',

  options: {
    foreground: option({
      defaultValue: false,
      description: 'Keep the process in the foreground. Implies --show_logs',
      nullable: true,
      typeName: 'boolean',
    }),
    show_logs: option({
      defaultValue: false,
      description: 'Stream the console output',
      nullable: true,
      typeName: 'boolean',
    }),
  },

  async action({ foreground, show_logs }) {
    if (!checkDockerDirExists()) {
      return;
    }
    const showLogs = show_logs || foreground;

    // TODO check if docker is running
    try {
      await dockerStop();
      await dockerRemove();
      await dockerBuild(showLogs);
    } catch (err) {
      console.log(
        'Error while building the container. Examine the log using --show_logs.'
      );
      console.error(err);
      process.exit(1);
    }
  },
});

export async function dockerStop(): Promise<void> {
  console.log('Stopping the previous container...');

  const cmd = 'docker stop rise-node';
  log('$', cmd);
  try {
    execSync(cmd);
  } catch (e) {
    log(e);
  }
}

// tslint:disable-next-line:no-identical-functions
export async function dockerRemove(): Promise<void> {
  console.log('Removing the previous container...');

  const cmd = 'docker rm rise-node';
  log('$', cmd);
  try {
    execSync(cmd);
  } catch (e) {
    log(e);
  }
}

async function dockerBuild(showLogs: boolean): Promise<void> {
  console.log('Building the image...');

  // build
  await new Promise((resolve, reject) => {
    const cmd = 'docker build -t rise-local/node .';
    log('$', cmd);
    const proc = exec(cmd, {
      cwd: getDockerDir(),
      timeout: 5 * MIN,
    });
    function line(data: string) {
      if (showLogs) {
        process.stdout.write(data);
      } else {
        log(data);
      }
    }
    proc.stdout.on('data', line);
    proc.stderr.on('data', line);
    proc.on('close', (code) => {
      log('close', code);
      code ? reject(code) : resolve(code);
    });
  });

  log('build done');
  console.log('Build complete');
}

function checkDockerDirExists(): boolean {
  if (!fs.existsSync(DOCKER_DIR) || !fs.lstatSync(DOCKER_DIR).isDirectory()) {
    console.log(`Error: directory '${DOCKER_DIR}' doesn't exist.`);
    console.log('You can download the latest version using:');
    console.log('  ./rise docker download');
    return false;
  }
  return true;
}
