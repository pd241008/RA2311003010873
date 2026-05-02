import { Log } from "logging_middleware";
import { fetchDepots, fetchVehicles, Depot, Vehicle } from "./api_service";

export interface ScheduleResult {
  depotId: string;
  hoursUsed: number;
  score: number;
  tasks: string[];
}

export const generateSchedule = async (): Promise<ScheduleResult[]> => {
  Log("Backend", "INFO", "scheduler", "starting schedule generation");
  
  const [depots, vehicles] = await Promise.all([
    fetchDepots(),
    fetchVehicles()
  ]);

  Log("Backend", "INFO", "scheduler", `got ${depots.length} depots, ${vehicles.length} vehicles`);

  const results: ScheduleResult[] = [];

  for (const depot of depots) {
    const validVehicles = vehicles.filter(v => v.depotId === depot.ID || !v.depotId);

    const W = depot.MechanicHours;
    const n = validVehicles.length;
    
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      const v = validVehicles[i - 1];
      const weight = v.Duration;
      const value = v.Impact;
      
      for (let w = 0; w <= W; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    let w = W;
    const tasks: string[] = [];
    let hoursUsed = 0;
    
    for (let i = n; i > 0 && dp[i][w] > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        const v = validVehicles[i - 1];
        tasks.push(v.TaskID);
        hoursUsed += v.Duration;
        w -= v.Duration;
      }
    }
    
    const score = dp[n][W];
    Log("Backend", "INFO", "scheduler", `depot ${depot.ID} done: score=${score}, hours=${hoursUsed}`);
    
    results.push({
      depotId: depot.ID,
      hoursUsed,
      score,
      tasks: tasks.reverse()
    });
  }

  return results;
};
