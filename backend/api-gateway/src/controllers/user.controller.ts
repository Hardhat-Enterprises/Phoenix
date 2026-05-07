import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger, GeoLocation, EventStatus,LinkedEventType,Season,ReferenceDay,ReferenceTime,} from "@phoenix/common";

export const getHealth = (req: Request, res: Response) => {
  userGrpcClient.GetUserHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserHealth: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching user health" });
    }
    return res
      .status(response.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getUser = (req: Request, res: Response) => {
  userGrpcClient.GetUsers({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUsers: ${error}`);
      res
        .status(
          response.status || HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .json({ message: "Error fetching users" });
    }
    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      message: response?.message,
      user: response?.users,
    });
  });
};

export const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await GeoLocation.findAll({
      attributes: [
        "geo_location_id",
        "country",
        "state_region",
        "local_government_area",
        "suburb",
        "latitude",
        "longitude",
        "geo_precision",
      ],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Locations fetched successfully",
      locations,
    });
  } catch (error) {
    logger.error(`Error fetching locations: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching locations",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEventStatuses = async (req: Request, res: Response) => {
  try {
    const eventStatuses = await EventStatus.findAll({
      attributes: ["event_status_id", "event_status_description"],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Event statuses fetched successfully",
      eventStatuses,
    });
  } catch (error) {
    logger.error(`Error fetching event statuses: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching event statuses",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getLinkedEventTypes = async (req: Request, res: Response) => {
  try {
    const linkedEventTypes = await LinkedEventType.findAll({
      attributes: [
        "linked_event_type_id",
        "linked_event_type_description",
      ],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Linked event types fetched successfully",
      linkedEventTypes,
    });
  } catch (error) {
    logger.error(`Error fetching linked event types: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching linked event types",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getSeasons = async (req: Request, res: Response) => {
  try {
    const seasons = await Season.findAll({
      attributes: ["season_id", "season_description"],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Seasons fetched successfully",
      seasons,
    });
  } catch (error) {
    logger.error(`Error fetching seasons: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching seasons",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getReferenceDays = async (req: Request, res: Response) => {
  try {
    const referenceDays = await ReferenceDay.findAll({
      attributes: [
        "ref_date",
        "locale_id",
        "dow",
        "is_weekend",
        "season",
        "is_holiday",
      ],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Reference days fetched successfully",
      referenceDays,
    });
  } catch (error) {
    logger.error(`Error fetching reference days: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching reference days",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getReferenceTimes = async (req: Request, res: Response) => {
  try {
    const referenceTimes = await ReferenceTime.findAll({
      attributes: ["ref_time", "is_nighttime", "is_business_hours"],
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Reference times fetched successfully",
      referenceTimes,
    });
  } catch (error) {
    logger.error(`Error fetching reference times: ${error}`);

    return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "Error fetching reference times",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};