import { clearInterval } from "node:timers";
import { exec } from "node:child_process";

const portMapping = {
  php: 81,
  node: 82,
  java_threads: 83,
  java_vthreads: 84,
};

async function get(port, timeout) {
  const start = new Date().valueOf();
  let error = null;
  const response = await fetch(
    `http://localhost:${port}/test?timeout=${timeout}`
  ).catch((err) => {
    console.log(err);
    error = err;
  });
  return {
    status: response?.status || 500,
    time: new Date().valueOf() - start,
    error,
  };
}

async function thread(port, timeout, breakTime, results) {
  while (true) {
    const result = await get(port, timeout);
    results.push(result);
    if (new Date().valueOf() > breakTime) {
      break;
    }
  }
}

function parseDockerStatsLine(line) {
  const m = line.match(
    /.*?(?<cpu>\d+(\.\d+)?)%\s+(?<memory>\d+(\.\d+)?)(?<memoryUnit>MiB|GiB) \/ 2GiB.*/
  );

  if (!m?.groups) {
    console.log(line);
    return { memory: 0, cpu: 0 };
  }
  const { memory, memoryUnit, cpu } = m.groups;

  const result = {
    memory: Number(memory) * (memoryUnit === "MiB" ? 1 : 1024),
    cpu: Number(cpu),
  };

  return result;
}

function parseDockerStats(stats, container) {
  const lines = stats.split("\n");
  let result = null;
  for (const line of lines) {
    if (!line.includes(container)) {
      continue;
    }
    result = parseDockerStatsLine(line);
  }
  return result;
}

let maxMemory = 0;
let maxCpu = 0;

const NUM_THREADS = 3000;
const TEST_TIME = 60;
const TIMEOUT = 1;
const SERVER_TYPE = "node";
console.log(
  `Running tests for "${SERVER_TYPE}" with ${NUM_THREADS} threads and a timeout of ${TIMEOUT} seconds for a test time of ${TEST_TIME} seconds.`
);

const intervalId = setInterval(
  () =>
    exec("docker stats --no-stream --no-trunc", (err, output) => {
      if (err) {
        return;
      }
      const { memory, cpu } = parseDockerStats(output, `perf-${SERVER_TYPE}-1`);
      maxMemory = Math.max(memory, maxMemory);
      maxCpu = Math.max(cpu, maxCpu);
      console.log({ memory, cpu });
    }),
  1000
);

const threads = [];
const results = [];
for (let i = 0; i < NUM_THREADS; i += 1) {
  threads.push(
    thread(
      portMapping[SERVER_TYPE],
      TIMEOUT,
      new Date().valueOf() + TEST_TIME * 1000,
      results
    )
  );
}

const start = new Date().valueOf();
await Promise.all(threads);
clearInterval(intervalId);

const end = new Date().valueOf();
const duration = (end - start) / 1000;
const throughput = results.length / duration;

const latencies = [];
let errors = 0;
for (const result of results) {
  latencies.push(result.time);
  if (result.status > 201) {
    errors += 1;
  }
}
latencies.sort((a, b) => a - b);

const p50 = latencies[Math.floor(latencies.length * 0.5)];
const p99 = latencies[Math.floor(latencies.length * 0.99)];
const p999 = latencies[Math.floor(latencies.length * 0.999)];
console.log({
  p50,
  p99,
  p999,
  throughput,
  duration,
  errors,
  maxMemory,
  maxCpu,
});
