import axios from "axios";

const LOG_API_URL = "http://20.207.122.201/evaluation-service/log";

export const Log = async (
  stack: "Backend" | "Frontend",
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  package_name: string,
  message: string
) => {
  const timestamp = new Date().toISOString();
  const colorMap = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    DEBUG: '\x1b[35m',
  };
  const resetColor = '\x1b[0m';
  const color = colorMap[level] || resetColor;
  console.log(`[${timestamp}] ${color}[${level}]${resetColor} [${stack}] [${package_name}]: ${message}`);

  const token = process.env.ACCESS_TOKEN;
  
  if (!token) {
    console.warn("\x1b[33m[Logger Warning]: ACCESS_TOKEN is missing. Logs will NOT be pushed to external API.\x1b[0m");
    return;
  }

  try {
    await axios.post(
      LOG_API_URL,
      {
        stack,
        level,
        package: package_name,
        message
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: any) {
    console.error("\x1b[31m[Logger Error]: Failed to push log to external API\x1b[0m", error.response?.data || error.message);
  }
};
