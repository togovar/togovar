/* eslint-disable no-console */

import chalk from 'chalk';
import ip from 'ip';

type TunnelUrl = string | false | undefined;

type Logger = {
  error: (error: unknown) => void;
  appStarted: (port: number, host: string, tunnelStarted?: TunnelUrl) => void;
};

const divider = chalk.gray('\n-----------------------------------');

// 起動失敗時も例外の形に依存せず、コンソールへ読める文字列を出すために共通化する。
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const logger: Logger = {
  // サーバー起動処理からは表示方法だけを委譲し、終了判断は呼び出し元に残すため分けている。
  error: (error) => {
    console.error(chalk.red(formatError(error)));
  },

  // 開発時に同じ起動ログからlocalhostとLANの両方へアクセスできるようにURLをまとめて出す。
  appStarted: (port, host, tunnelStarted) => {
    console.log(`Server started ! ${chalk.green('✓')}`);

    if (tunnelStarted) {
      console.log(`Tunnel initialised ${chalk.green('✓')}`);
    }

    console.log(`
${chalk.bold('Access URLs:')}${divider}
Localhost: ${chalk.magenta(`http://${host}:${port}`)}
      LAN: ${
        chalk.magenta(`http://${ip.address()}:${port}`) +
        (tunnelStarted ? `\n    Proxy: ${chalk.magenta(tunnelStarted)}` : '')
      }${divider}
${chalk.blue(`Press ${chalk.italic('CTRL-C')} to stop`)}
    `);
  },
};

export default logger;
