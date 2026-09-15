import { Request, Response } from "express";
import { notificationGrpcClient } from "../grpc/notification.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";
import {
  combineThreatAnalysis,
  RuleEngineResult,
} from "@phoenix/common/helper/response-decision";
import { AdcrsRiskOutput } from "@phoenix/common/helper/teavs-adcrs";

export const getHealth = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotificationHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetNotificationHealth: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching notification health" });
    }
    return res
      .status(response.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getNotifications = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotifications({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetNotifications: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching notifications" });
    }
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      message: response?.message,
      notifications: response?.notifications,
    });
  });
};

/**
 * Runs the Response Decision Manager against one rule-engine result and one
 * ADCRS result, then forwards the combined decision to the notification
 * service. This is the end-to-end path the team's Workflow and Sequence
 * Diagrams describe (Threat Analysis Engine + ADCRS -> Response Decision
 * Manager -> Notification) but that did not exist as working code before.
 *
 * Expected body: { event_id, ruleResult: RuleEngineResult, adcrsOutput: AdcrsRiskOutput, recipient? }
 */
export const createNotificationFromThreatAnalysis = (
  req: Request,
  res: Response,
) => {
  const { event_id, ruleResult, adcrsOutput, recipient } = req.body as {
    event_id: string;
    ruleResult: RuleEngineResult;
    adcrsOutput: AdcrsRiskOutput;
    recipient?: string;
  };

  if (!event_id || !ruleResult || !adcrsOutput) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      message: "event_id, ruleResult, and adcrsOutput are required",
    });
  }

  let combined;
  try {
    combined = combineThreatAnalysis(event_id, ruleResult, adcrsOutput);
  } catch (error) {
    logger.error(`Response Decision Manager rejected input for ${event_id}: ${error}`);
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      message: `${error}`,
    });
  }

  notificationGrpcClient.CreateNotification(
    { ...combined, recipient },
    (error, response) => {
      if (error) {
        logger.error(`Error calling CreateNotification: ${error}`);
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ message: "Error creating notification" });
      }
      return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
        message: response?.message,
        combinedResult: combined,
        notification: response?.notification,
      });
    },
  );
};
