import { notImplemented } from "./_utils.ts";

/** https://nodejs.org/api/process.html#process_process_arch */
export const arch = Deno.build.arch;

/** https://nodejs.org/api/process.html#process_process_chdir_directory */
export const chdir = Deno.chdir;

/** https://nodejs.org/api/process.html#process_process_cwd */
export const cwd = Deno.cwd;

/** https://nodejs.org/api/process.html#process_process_exit_code */
export const exit = Deno.exit;

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

// Memoize argv and env. See https://nodejs.org/api/process.html#process_process_env
// Callers may expect to be able to set properties globally within a node instance
let _argv: string[] | undefined;
let _env: { [index: string]: string } | undefined;

/** https://nodejs.org/api/process.html#process_process */
// @deprecated `import { process } from 'process'` for backwards compatibility with old deno versions
export const process = {
  arch,
  chdir,
  cwd,
  exit,
  pid,
  platform,
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
    _argv = _argv || [Deno.execPath(), ...Deno.args];
    return _argv;
  },

  /** https://nodejs.org/api/process.html#process_process_env */
  get env(): { [index: string]: string } {
    // Getter delegates --allow-env and --allow-read until request
    _env = _env || Deno.env.toObject();
    return _env;
  },
};

// NB: For `env` and `argv` we cannot reuse process.env and process.argv. Those
// are evaluated at import time and require permissions even if not imported.
//
// Instead, we must create proxies that manually delegate the properties and
// methods of `process.argv` and `process.env` at runtime.
//
// This minimal implementation can be further refined to allow e.g. argv[1] not
// to require execPath permission, and then process.env and process.argv could
// forward to these proxies rather than the reverse.

/**
 * https://nodejs.org/api/process.html#process_process_argv
 * @example `import { argv } from './std/node/process.ts'; console.log(argv)`
 */
export const argv: string[] = new Proxy([], {
  get(_, index: number): string {
    return Reflect.get(process.argv, index);
  },
  set(_, index, value): boolean {
    return Reflect.set(process.argv, index, value);
  },
  has(_, key): boolean {
    return Reflect.has(process.argv, key);
  },
  ownKeys(_): Array<string | number | symbol> {
    return Reflect.ownKeys(process.argv);
  },
  getOwnPropertyDescriptor(_, key): PropertyDescriptor | undefined {
    return Reflect.getOwnPropertyDescriptor(process.argv, key);
  },
});

/**
 * https://nodejs.org/api/process.html#process_process_env
 * @example `import { env } from './std/node/process.ts'; console.log(env)`
 */
export const env: { [index: string]: string } = new Proxy({}, {
  get(_, key: string): string {
    return Reflect.get(process.env, key);
  },
  set(_, key, value): boolean {
    return Reflect.set(process.env, key, value);
  },
  deleteProperty(_, key): boolean {
    return Reflect.deleteProperty(process.env, key);
  },
  has(_, key): boolean {
    return Reflect.has(process.env, key);
  },
  ownKeys(_): Array<string | number | symbol> {
    return Reflect.ownKeys(process.env);
  },
  getOwnPropertyDescriptor(_, key): PropertyDescriptor | undefined {
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
