import { Request, Response } from "express";
import { HttpStatusCode, logger } from "@phoenix/common";
import { userGrpcClient } from "../grpc/user.grpc";

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const mapAssessment = (assessment: any) => ({
  ...assessment,
  input: parseJsonObject(assessment?.input),
  teavs_alert: parseJsonObject(assessment?.teavs_alert),
});

export const getRiskAssessments = (req: Request, res: Response) => {
  const { risk_level, status, page, limit } = req.query;
  const grpcRequest = {
    risk_level: (risk_level as string) || "",
    status: (status as string) || "",
    page: page ? Number.parseInt(page as string, 10) : 1,
    limit: limit ? Number.parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetRiskAssessments(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetRiskAssessments: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({
          status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
          message: "Error fetching risk assessments",
        });
    }

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      risk_assessments: (response.risk_assessments || []).map(mapAssessment),
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getRiskAssessment = (req: Request, res: Response) => {
  userGrpcClient.GetRiskAssessment(
    { risk_assessment_id: req.params.assessmentId as string },
    (error, response) => {
      if (error) {
        logger.error(`Error calling GetRiskAssessment: ${error}`);
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({
            status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
            message: "Error fetching risk assessment",
          });
      }

      return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
        status: response.status,
        message: response.message,
        risk_assessment: response.risk_assessment
          ? mapAssessment(response.risk_assessment)
          : null,
      });
    },
  );
};
