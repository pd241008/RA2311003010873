import axios from "axios";
import { Log } from "logging_middleware";

const BASE_URL = "http://20.207.122.201/evaluation-service";

export interface Depot {
  id: string;
  MechanicHours: number;
}

export interface Vehicle {
  TaskID: string;
  duration: number;
  impactScore: number;
  depotId?: string;
}

export const fetchDepots = async (): Promise<Depot[]> => {
  try {
    const token = process.env.ACCESS_TOKEN;
    if (!token) throw new Error("ACCESS_TOKEN is not defined in .env");

    Log("Backend", "INFO", "api", "fetching depots from api");
    const response = await axios.get(`${BASE_URL}/depots`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    Log("Backend", "ERROR", "api", `failed to get depots: ${error.message}`);
    throw error;
  }
};

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const token = process.env.ACCESS_TOKEN;
    if (!token) throw new Error("ACCESS_TOKEN is not defined in .env");

    Log("Backend", "INFO", "api", "fetching vehicles...");
    const response = await axios.get(`${BASE_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    Log("Backend", "ERROR", "api", `failed to get vehicles: ${error.message}`);
    throw error;
  }
};
