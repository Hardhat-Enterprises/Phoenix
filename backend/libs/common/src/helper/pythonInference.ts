import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

const cleanEnvPath = (value?: string) => {
  return value?.replace(/^['"]|['"]$/g, "").trim();
};

const resolveProjectPath = (value: string) => {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
};

export const runInference = async (
  modelBuffer: Buffer,
  inputData: any,
): Promise<any> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-model-"));
  const tempModelPath = path.join(tempDir, `${crypto.randomUUID()}.joblib`);

  try {
    await fs.writeFile(tempModelPath, modelBuffer);

    const pythonBinEnv = cleanEnvPath(process.env.PYTHON_BIN);
    const scriptPathEnv = cleanEnvPath(process.env.CORE_MODEL_SCRIPT_PATH);

    const pythonBin = pythonBinEnv
      ? resolveProjectPath(pythonBinEnv)
      : "python3";

    const pythonScriptPath = scriptPathEnv
      ? resolveProjectPath(scriptPathEnv)
      : path.resolve(
          process.cwd(),
          "libs/common/src/helper/core_model_integration.py",
        );

    return await new Promise((resolve, reject) => {
      const py = spawn(pythonBin, [pythonScriptPath, tempModelPath]);

      let output = "";
      let error = "";

      const timeout = setTimeout(() => {
        py.kill();
        reject(new Error("Python inference timed out"));
      }, 30000);

      const inputJson = JSON.stringify(inputData);

      if (!inputJson) {
        clearTimeout(timeout);
        py.kill();
        reject(new Error("Input data is undefined or cannot be stringified"));
        return;
      }

      py.stdin.write(inputJson);
      py.stdin.end();

      py.stdout.on("data", (data) => {
        output += data.toString();
      });

      py.stderr.on("data", (data) => {
        error += data.toString();
      });

      py.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      py.on("close", (code) => {
        clearTimeout(timeout);

        try {
          const parsed = JSON.parse(output);

          if (code !== 0 || parsed.success === false) {
            return reject(
              new Error(parsed.error || error || "Python inference failed"),
            );
          }

          resolve(parsed.data);
        } catch {
          reject(
            new Error(
              `Failed to parse Python output. Code: ${code}. Output: ${output}. Error: ${error}`,
            ),
          );
        }
      });
    });
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
};
