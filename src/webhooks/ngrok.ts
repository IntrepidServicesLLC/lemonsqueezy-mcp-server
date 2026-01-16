import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

export interface NgrokTunnel {
  publicUrl: string;
  localUrl: string;
}

let ngrokProcess: ReturnType<typeof exec> | null = null;
let tunnelInfo: NgrokTunnel | null = null;

export async function startNgrokTunnel(port: number): Promise<NgrokTunnel> {
  if (!config.enableNgrok) {
    throw new Error("Ngrok is not enabled in config");
  }

  if (tunnelInfo) {
    return tunnelInfo;
  }

  try {
    // Start ngrok tunnel
    const command = `ngrok http ${port} --log=stdout`;
    ngrokProcess = exec(command);

    // Wait a moment for ngrok to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get ngrok API URL (ngrok exposes local API on port 4040)
    const response = await fetch("http://localhost:4040/api/tunnels");
    const data = (await response.json()) as {
      tunnels: Array<{
        public_url: string;
        config: { addr: string };
      }>;
    };

    if (data.tunnels && data.tunnels.length > 0) {
      const tunnel = data.tunnels[0];
      tunnelInfo = {
        publicUrl: tunnel.public_url,
        localUrl: tunnel.config.addr,
      };
      logger.info(
        { publicUrl: tunnelInfo.publicUrl, localUrl: tunnelInfo.localUrl },
        "Ngrok tunnel established"
      );
      return tunnelInfo;
    }

    throw new Error("Failed to get ngrok tunnel information");
  } catch (error) {
    logger.error({ error, port }, "Failed to start ngrok tunnel");
    throw error;
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  if (ngrokProcess) {
    ngrokProcess.kill();
    ngrokProcess = null;
    tunnelInfo = null;
  }
}

export function getNgrokUrl(): string | null {
  return tunnelInfo?.publicUrl || null;
}
