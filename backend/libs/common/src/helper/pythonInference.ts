import { spawn } from "child_process";

export const runInference = (
  modelPath: string,
  inputData: any,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["inference.py", modelPath]);

    let output = "";
    let error = "";

    py.stdin.write(JSON.stringify(inputData));
    py.stdin.end();

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(error);
      }
      resolve(JSON.parse(output));
    });
  });
};
