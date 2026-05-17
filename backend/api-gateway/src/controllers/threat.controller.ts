import { Request, Response } from "express";
import { threatGrpcClient } from "../grpc/threat.grpc";

export const getThreatHealth = (req: Request, res: Response) => {
  threatGrpcClient.GetThreatHealth({}, (error: any, response: any) => {
    if (error) {
      return res.status(500).json({ message: "Error fetching threat health", error });
    }

    return res.status(200).json(response);
  });
};

export const getThreats = (req: Request, res: Response) => {
  threatGrpcClient.GetThreats({}, (error: any, response: any) => {
    if (error) {
      return res.status(500).json({ message: "Error fetching threats", error });
    }

    return res.status(200).json(response);
  });
};

export const getThreatStats = (req: Request, res: Response) => {
  threatGrpcClient.GetThreatStats({}, (error: any, response: any) => {
    if (error) {
      return res.status(500).json({ message: "Error fetching threat statistics", error });
    }

    return res.status(200).json(response);
  });
};

export const ingestThreat = (req: Request, res: Response) => {
  threatGrpcClient.IngestThreat(req.body, (error: any, response: any) => {
    if (error) {
      return res.status(500).json({ message: "Error ingesting threat", error });
    }

    return res.status(response.status || 201).json(response);
  });
};
