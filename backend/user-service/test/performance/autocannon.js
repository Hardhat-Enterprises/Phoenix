const autocannon = require("autocannon");

const url = "http://localhost:3000/api/users";

console.log("Cache HIT performance test");
console.log("Make sure users:all is already cached before running this test.");

autocannon(
  {
    url,
    connections: 10,
    duration: 10,
  },
  (err, result) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log("\n=== CACHE HIT PERFORMANCE ===");
    console.log(autocannon.printResult(result));

    console.log("\nRequests/sec:", result.requests.average);
    console.log("Average latency (ms):", result.latency.average);
    console.log("Max latency (ms):", result.latency.max);
  },
);