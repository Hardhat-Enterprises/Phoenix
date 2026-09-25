import { analyseSecurityEvent } from "./analyticsService";

function createEvent(
  event: "INVALID_JWT" | "FORBIDDEN_ACCESS" | "RATE_LIMIT_EXCEEDED"
) {
  return {
    event,
    severity: "HIGH" as const,
    message: "Test security event",
    endpoint: "/test",
    method: "GET",
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
    userId: "test-user",
  };
}

console.log("Testing authentication analytics...");

for (let i = 1; i <= 5; i++) {
  const result = analyseSecurityEvent(
    createEvent("INVALID_JWT")
  );

  console.log(`Authentication event ${i}`);

  if (result.suspicious) {
    console.log(result.alerts);
  }
}