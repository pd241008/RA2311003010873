import { Log } from "logging_middleware";
import { fetchDepots, fetchVehicles, Depot, Vehicle } from "./api_service";

export interface ScheduleResult {
  depotId: string;
  totalMechanicHoursUtilized: number;
  maxImpactScoreAchieved: number;
  scheduledTaskIds: string[];
}

export const generateSchedule = async (): Promise<ScheduleResult[]> => {
  Log("Backend", "INFO", "scheduler-service", "Initiating schedule generation pipeline");
  
  const [depots, vehicles] = await Promise.all([
    fetchDepots(),
    fetchVehicles()
  ]);

  Log("Backend", "INFO", "scheduler-service", `Fetched ${depots.length} depots and ${vehicles.length} vehicles`);

  const results: ScheduleResult[] = [];

  for (const depot of depots) {
    Log("Backend", "DEBUG", "scheduler-service", `Processing DP Knapsack for Depot ${depot.id} with budget ${depot.MechanicHours}`);
    
    const depotVehicles = vehicles.filter(v => v.depotId === depot.id || v.depotId === undefined);
    Log("Backend", "INFO", "scheduler-service", `Filtered ${depotVehicles.length} relevant vehicles for Depot ${depot.id}`);

    const W = depot.MechanicHours;
    const n = depotVehicles.length;
    
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      const v = depotVehicles[i - 1];
      const weight = v.duration;
      const value = v.impactScore;
      
      for (let w = 0; w <= W; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    let w = W;
    const scheduledTaskIds: string[] = [];
    let hoursUtilized = 0;
    
    for (let i = n; i > 0 && dp[i][w] > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        const v = depotVehicles[i - 1];
        scheduledTaskIds.push(v.TaskID);
        hoursUtilized += v.duration;
        w -= v.duration;
      }
    }
    
    const maxImpactScoreAchieved = dp[n][W];
    Log("Backend", "INFO", "scheduler-service", `Depot ${depot.id} scheduling complete: Score=${maxImpactScoreAchieved}, Hours=${hoursUtilized}`);
    
    results.push({
      depotId: depot.id,
      totalMechanicHoursUtilized: hoursUtilized,
      maxImpactScoreAchieved,
      scheduledTaskIds: scheduledTaskIds.reverse()
    });
  }

  Log("Backend", "INFO", "scheduler-service", "Schedule generation pipeline completed successfully");
  return results;
};
