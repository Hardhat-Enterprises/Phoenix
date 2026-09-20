import { Request, Response } from "express";
import { fetchDashboardOverview } from "../services/dashboardService";

export const getDashboardOverview = (
  req: Request,
  res: Response
) => {
  const data = fetchDashboardOverview();

  res.status(200).json({
    status: 200,
    message: "Dashboard overview retrieved successfully",
    data,
  });
};