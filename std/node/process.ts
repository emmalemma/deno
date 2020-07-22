import { notImplemented } from "./_utils.ts";

/** https://nodejs.org/api/process.html#process_process_arch */
export const arch = Deno.build.arch;

/** https://nodejs.org/api/process.html#process_process_chdir_directory */
export const chdir = Deno.chdir;

/** https://nodejs.org/api/process.html#process_process_cwd */
export const cwd = Deno.cwd;

/** https://nodejs.org/api/process.html#process_process_exit_code */
export const exit = Deno.exit;

/** https://nodejs.org/api/process.html#process_process_nexttick_callback_args **/
export function nextTick(callback: Function, ...args: any[]): void {
  queueMicrotask(function () {
    // queueMicrotask calls with `this` as `undefined`, but process.nextTick callers might expect the nodejs `global` variable
    callback.apply((globalThis as any)["global"], args);
  });
}

/** https://nodejs.org/api/process.html#process_process_pid */
export const pid = Deno.pid;

/** https://nodejs.org/api/process.html#process_process_platform */
export const platform = Deno.build.os === "windows" ? "win32" : Deno.build.os;

/** https://nodejs.org/api/process.html#process_process_version */
export const version = `v${Deno.version.deno}`;

/** https://nodejs.org/api/process.html#process_process_versions */
export const versions = {
  node: Deno.version.deno,
  ...Deno.version,
};

/** https://nodejs.org/api/process.html#process_process */
// @deprecated `import { process } from 'process'` for backwards compatibility with old deno versions
export const process = {
  arch,
  chdir,
  cwd,
  exit,
  pid,
  platform,
  nextTick,
  version,
  versions,

  /** https://nodejs.org/api/process.html#process_process_events */
  // on is not exported by node, it is only available within process:
  // node --input-type=module -e "import { on } from 'process'; console.log(on)"
  on(_event: string, _callback: Function): void {
    // TODO(rsp): to be implemented
    notImplemented();
  },

  /** https://nodejs.org/api/process.html#process_process_argv */
  get argv(): string[] {
    // Getter delegates --allow-env and --allow-read until request
    // Getter also allows the export Proxy instance to function as intended
    return [Deno.execPath(), ...Deno.args];
  },

  /** https://nodejs.org/api/process.html#process_process_env */
  get env(): { [index: string]: string } {
    // Getter delegates --allow-env and --allow-read until request
    // Getter also allows the export Proxy instance to function as intended
    return Deno.env.toObject();
  },
};

// NB: For `env` and `argv` we cannot reuse process.env and process.argv. Those
// are evaluated at import time and require permissions even if not imported.
//
// Instead, we must create proxies that manually delegate the properties and
// methods of `argv` and `env` at runtime.
//
// This minimal implementation can be further refined to allow e.g. argv[1] not
// to require execPath permission.

/**
 * https://nodejs.org/api/process.html#process_process_argv
 * @example `import { argv } from './std/node/process.ts'; console.log(argv)`
 */
export const argv : string[] = new Proxy([], {
  get(_, index: number): string {
    return Reflect.get(process.argv, index);
  },
  apply(_, key, args): string {
    return Reflect.get(process.argv, key, args);
  },
  has(_, key) {
    return Reflect.has(process.argv, key);
  },
  ownKeys(_) {
    return Reflect.ownKeys(process.argv);
  },
  getOwnPropertyDescriptor(_, key) {
    return Reflect.getOwnPropertyDescriptor(process.argv, key);
  },
}) as string[];

/**
 * https://nodejs.org/api/process.html#process_process_env
 * @example `import { env } from './std/node/process.ts'; console.log(env)`
 */
export const env: { [index: string]: string } = new Proxy({}, {
  get(_, prop: string): string {
    return process.env[prop];
  },
  apply(_, key, args): string {
    return Reflect.get(process.env, key, args);
  },
  has(_, key) {
    return Reflect.has(process.env, key);
  },
  ownKeys(_) {
    return Reflect.ownKeys(process.env);
  },
  getOwnPropertyDescriptor(_, key) {
    return Reflect.getOwnPropertyDescriptor(process.env, key);
  },
});

// import process from './std/node/process.ts'
export default process;

// Define the type for the global declration
type Process = typeof process;

Object.defineProperty(process, Symbol.toStringTag, {
  enumerable: false,
  writable: true,
  configurable: false,
  value: "process",
});

Object.defineProperty(globalThis, "process", {
  value: process,
  enumerable: false,
  writable: true,
  configurable: true,
});

declare global {
  const process: Process;
}
