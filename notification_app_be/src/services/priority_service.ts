import { Log } from "logging_middleware";
import { fetchNotifications, NotificationItem } from "./api_service";

export interface PrioritizedNotification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  score: number;
}

export const getPriorityInbox = async (topN: number = 10): Promise<PrioritizedNotification[]> => {
  Log("Backend", "INFO", "priority", "calculating priority inbox items");
  
  const notifications = await fetchNotifications();

  const weights: Record<string, number> = {
    "Placement": 500,
    "Result": 300,
    "Event": 100
  };

  const prioritized = notifications.map(item => {
    const calculateScore = (type: string, time: string) => {
      const base = weights[type as keyof typeof weights] || 0;
      const recency = new Date(time).getTime() / 1000;
      return base + (recency / 100000); 
    };

    return {
      id: item.ID,
      type: item.Type,
      message: item.Message,
      timestamp: item.Timestamp,
      score: calculateScore(item.Type, item.Timestamp)
    };
  });

  const sorted = prioritized.sort((a, b) => b.score - a.score);

  return sorted.slice(0, topN);
};
