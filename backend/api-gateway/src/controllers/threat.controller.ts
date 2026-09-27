import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getThreats = (req: Request, res: Response) => {
  const { threat_type, severity, page, limit, format } = req.query;

  if (format && format !== "csv" && format !== "json") {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      message: "Invalid export format. Please use csv or json.",
    });
  }

  const grpcRequest = {
    threat_type: (threat_type as string) || "",
    severity: (severity as string) || "",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetThreats(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetThreats: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching threats" });
    }

    // Filtered threats for JSON/CSV export using only approved fields
    const responseThreats = response.threats.map((threat) => ({
      threat_id: threat.threat_id,
      event_id: threat.event_id,
      timestamp: threat.timestamp,
      event_type: threat.event_type,
      source: threat.source,
      threat_type: threat.threat_type,
      severity: threat.severity,
      confidence_score: threat.confidence_score,
      details: threat.details
        ? (() => {
          try {
            return JSON.parse(threat.details);
          } catch {
            return threat.details;
          }
        })()
        : {},
    }));

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=threats.json",
      );

      return res.status(HttpStatusCode.HTTP_STATUS_OK).json(responseThreats);
    }

    if (format === "csv") {
      const headers = [
        "threat_id",
        "event_id",
        "timestamp",
        "event_type",
        "source",
        "threat_type",
        "severity",
        "confidence_score",
        "details",
      ];

      const csvRows = responseThreats.map((threat) =>
        headers
          .map((header) => {
            const value = threat[header as keyof typeof threat];

            if (value === null || value === undefined) {
              return "";
            }

            const stringValue =
              typeof value === "object" ? JSON.stringify(value) : String(value);

            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(","),
      );

      const csv = [headers.join(","), ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=threats.csv",
      );

      return res.status(HttpStatusCode.HTTP_STATUS_OK).send(csv);
    }


    logger.info(`GetThreats response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      threats: responseThreats,
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getThreat = (req: Request, res: Response) => {
  const threatId = req.params.threatId as string;

  userGrpcClient.GetThreat({ threat_id: threatId }, (error, response) => {
    if (error) {
      logger.error(`Error calling GetThreat: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching threat" });
    }
    logger.info(`GetThreat response from gRPC: ${JSON.stringify(response)}`);
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      threat: {
        ...response.threat,
        details: JSON.parse(
          response?.threat?.details ? response?.threat?.details : "",
        ),
      },
    });
  });
};
