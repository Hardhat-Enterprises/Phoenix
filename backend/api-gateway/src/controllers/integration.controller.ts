import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

export const getIntegrations = (req: Request, res: Response) => {
  const { from, to, page, limit } = req.query;

  const grpcRequest = {
    from: (from as string) || "",
    to: (to as string) || "",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
  };

  userGrpcClient.GetIntegrations(grpcRequest, (error, response) => {
    if (error) {
      logger.error(`Error calling GetIntegrations: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching integrations" });
    }
    logger.info(`Gets response from gRPC: ${JSON.stringify(response)}`);
    const returnIntergration = response.integrations.map((integration) => {
      return {
        ...integration,
        input: integration.input ? JSON.parse(integration.input) : {},
        output: integration.output ? JSON.parse(integration.output) : {},
      };
    });
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response.status,
      message: response.message,
      integrations: returnIntergration,
      total: response.total,
      page: response.page,
      limit: response.limit,
    });
  });
};

export const getIntegration = (req: Request, res: Response) => {
  const integrationId = req.params.integrationId as string;

  userGrpcClient.GetIntegration(
    { integration_event_id: integrationId },
    (error, response) => {
      if (error) {
        logger.error(`Error calling GetIntegration: ${error}`);
        return res
          .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ message: "Error fetching risk" });
      }
      logger.info(`GetIntegration response from gRPC: `, response.integration);
      return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
        status: response.status,
        message: response.message,
        integration: {
          ...response.integration,
          input: response?.integration?.input
            ? JSON.parse(response?.integration?.input)
            : {},
          output: response?.integration?.output
            ? JSON.parse(response?.integration?.output)
            : {},
        },
      });
    },
  );
};
