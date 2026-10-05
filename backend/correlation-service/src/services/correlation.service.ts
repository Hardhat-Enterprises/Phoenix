import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

import { logger } from "@phoenix/common";

import {
  CorrelationHealthResponse,
  CorrelationRequest,
  CorrelationResponse,
} from "../dto/correlation.dto";

const execFileAsync = promisify(execFile);

const PYTHON_BIN =
  process.env.PYTHON_BIN || "/app/.venv/bin/python";

const CORRELATION_API_PATH =
  process.env.CORRELATION_API_PATH ||
  path.resolve(
    process.cwd(),
    "correlation",
    "src",
    "api.py",
  );

const runPython = async (
  action: "analyse" | "health",
  payload: Record<string, unknown> = {},
) => {
  const input = JSON.stringify({
    action,
    ...payload,
  });

  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_BIN,
      [CORRELATION_API_PATH],
      {
        input,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
        },
      },
    );

    if (stderr) {
      logger.warn(`Correlation Python stderr: ${stderr}`);
    }

    const output = stdout.trim();

    if (!output) {
      throw new Error(
        "Correlation Python process returned empty output",
      );
    }

    return JSON.parse(output);
  } catch (error) {
    logger.error(
      `Correlation Python execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    throw error;
  }
};

export const analyseCorrelation = async (
  request: CorrelationRequest,
): Promise<CorrelationResponse> => {
  return runPython("analyse", {
    text: request.text,
    url: request.url,
    observed_time: request.observed_time,
    state: request.state,
  });
};

export const getCorrelationHealth =
  async (): Promise<CorrelationHealthResponse> => {
    return runPython("health");
  };