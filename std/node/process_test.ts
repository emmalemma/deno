import { assert, assertThrows, assertEquals } from "../testing/asserts.ts";
import * as all from "./process.ts";
import { env, argv } from "./process.ts";

// NOTE: Deno.execPath() (and thus process.argv) currently requires --allow-env
// (Also Deno.env.toObject() (and process.env) requires --allow-env but it's more obvious)

Deno.test({
  name: "process exports are as they should be",
  fn() {
    // * should be the same as process, default, and globalThis.process
    // without the export aliases, and with properties that are not standalone
    const allKeys = new Set<string>(Object.keys(all));
    // without { process } for deno b/c
    allKeys.delete("process");
    // without esm default
    allKeys.delete("default");
    // with on, which is not exported via *
    allKeys.add("on");
    const allStr = Array.from(allKeys).sort().join(" ");
    assertEquals(Object.keys(all.default).sort().join(" "), allStr);
    assertEquals(Object.keys(all.process).sort().join(" "), allStr);
    assertEquals(Object.keys(process).sort().join(" "), allStr);
  },
});

Deno.test({
  name: "process.cwd and process.chdir success",
  fn() {
    // this should be run like other tests from directory up
    assert(process.cwd().match(/\Wstd$/));
    process.chdir("node");
    assert(process.cwd().match(/\Wnode$/));
    process.chdir("..");
    assert(process.cwd().match(/\Wstd$/));
  },
});

Deno.test({
  name: "process.chdir failure",
  fn() {
    assertThrows(
      () => {
        process.chdir("non-existent-directory-name");
      },
      Deno.errors.NotFound,
      "file",
      // On every OS Deno returns: "No such file" except for Windows, where it's:
      // "The system cannot find the file specified. (os error 2)" so "file" is
      // the only common string here.
    );
  },
});

Deno.test({
  name: "process.version",
  fn() {
    assertEquals(typeof process, "object");
    assertEquals(typeof process.version, "string");
    assertEquals(typeof process.versions, "object");
    assertEquals(typeof process.versions.node, "string");
  },
});

Deno.test({
  name: "process.platform",
  fn() {
    assertEquals(typeof process.platform, "string");
  },
});

Deno.test({
  name: "process.arch",
  fn() {
    assertEquals(typeof process.arch, "string");
    // TODO(rsp): make sure that the arch strings should be the same in Node and Deno:
    assertEquals(process.arch, Deno.build.arch);
  },
});

Deno.test({
  name: "process.pid",
  fn() {
    assertEquals(typeof process.pid, "number");
    assertEquals(process.pid, Deno.pid);
  },
});

Deno.test({
  name: "process.on",
  fn() {
    assertEquals(typeof process.on, "function");
    assertThrows(
      () => {
        process.on("uncaughtException", (_err: Error) => {});
      },
      Error,
      "implemented",
    );
  },
});

Deno.test({
  name: "process.argv",
  fn() {
    assert(Array.isArray(process.argv));
    assert(Array.isArray(argv));
    assert(
      process.argv[0].match(/[^/\\]*deno[^/\\]*$/),
      "deno included in the file name of argv[0]",
    );

    // process.argv is a getter for a stored arguments array
    assert(process.argv === process.argv, "process.argv should === itself");

    // argv is a delegating proxy; test that it is properly iterable
    // (we aren't testing argv values, just that these operations succeed)
    const clonedArgv = [...argv];
    assertEquals(argv[0], Deno.execPath());
    assertEquals(argv.length, Deno.args.length + 1); // plus execPath
    argv.forEach((arg, index) => assertEquals(arg, clonedArgv[index]));
    for (let index in argv) {
      assert(
        argv.hasOwnProperty(index),
        "argv.hasOwnProperty should succeed for index " + index,
      );
      assertEquals(argv[index], clonedArgv[index]);
    }
  },
});

Deno.test({
  name: "process.env",
  fn() {
    assertEquals(typeof process.env.PATH, "string");
    assertEquals(typeof env.PATH, "string");

    // process.env is a getter for a stored Deno.env.toObject()
    assert(process.env === process.env, "process.env should === itself");

    // `env` is not; it is a delegating proxy
    assert(
      env !== process.env,
      "env proxy should not strictly equal process.env",
    );

    // according to node documentation, process.env allows set and delete
    assertEquals(env._very_unlikely_process_env_test_key, undefined);

    env._very_unlikely_process_env_test_key = "test value";

    assertEquals(env._very_unlikely_process_env_test_key, "test value");
    assertEquals(process.env._very_unlikely_process_env_test_key, "test value");

    delete env._very_unlikely_process_env_test_key;

    assertEquals(env._very_unlikely_process_env_test_key, undefined);
    assertEquals(process.env._very_unlikely_process_env_test_key, undefined);

    // test that the proxy is properly iterable
    for (let key in env) {
      assertEquals(env[key], Deno.env.get(key));
    }
    Object.keys(Deno.env.toObject()).forEach((key) => {
      assert(
        env.hasOwnProperty(key),
        "env.hasOwnProperty should succeed for " + key,
      );
    });
  },
});
