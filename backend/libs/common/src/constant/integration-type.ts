export enum IntegrationType {
  CORE = "core",
  ANOMALY = "anomaly",
  TIME_SERIES = "time-series",
  // Hazard correlation runs as its own integration so core model inference
  // is never replaced or altered by correlation work.
  CORRELATION = "correlation",
}