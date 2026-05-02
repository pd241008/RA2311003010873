import axios from "axios";
import { Log } from "logging_middleware";

const BASE_URL = "http://20.207.122.201/evaluation-service";

export interface NotificationItem {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

export const fetchNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const token = process.env.ACCESS_TOKEN;
    if (!token) throw new Error("ACCESS_TOKEN is not defined in .env");

    Log("Backend", "INFO", "api-client", "Fetching notifications from evaluation API");
    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    Log("Backend", "ERROR", "api-client", `Failed to fetch notifications: ${error.message}`);
    throw error;
  }
};
