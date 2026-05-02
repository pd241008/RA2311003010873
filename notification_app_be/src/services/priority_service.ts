import { Log } from "logging_middleware";
import { fetchNotifications, NotificationItem } from "./api_service";

interface PrioritizedNotification extends NotificationItem {
  priorityScore: number;
}

export const getPriorityInbox = async (topN: number = 10): Promise<PrioritizedNotification[]> => {
  Log("Backend", "INFO", "priority", "calculating priority inbox items");
  
  const notifications = await fetchNotifications();

  const weights: Record<string, number> = {
    "Placement": 300,
    "Result": 200,
    "Event": 100
  };

  const prioritized = notifications.map(notif => {
    const baseWeight = weights[notif.Type] || 0;
    
    const timeFactor = new Date(notif.Timestamp).getTime() / 10000000;
    
    const priorityScore = baseWeight + timeFactor;
    return { ...notif, priorityScore };
  });

  // sort highest first
  prioritized.sort((a, b) => b.priorityScore - a.priorityScore);

  return prioritized.slice(0, topN);
};
