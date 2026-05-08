import { HttpStatusCode, logger, User, GeoLocation, EventStatus, LinkedEventType,Season,ReferenceDay,ReferenceTime,
 } from "@phoenix/common";
import { GetHealthDto, GetUsersDto } from "../dto/user.dto";
import { GetHealthEntity, GetUsersEntity } from "../entity/user.entity";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is running",
  };
};

export const getUsers = async (
  getUsersDto: GetUsersDto
): Promise<GetUsersEntity> => {
  logger.info("Fetching users from database...");

  const existingUsers = await User.findAll({
    attributes: ["id", "name", "email"],
  });

  if (existingUsers.length === 0) {
    await User.bulkCreate([
      {
        name: "Prototype Name One",
        email: "testingemail1@gmail.com",
      },
      {
        name: "Prototype Name Two",
        email: "testingemail2@gmail.com",
      },
    ]);
  }

  const users = await User.findAll({
    attributes: ["id", "name", "email"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Users fetched successfully",
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
};

export const getLocations = async () => {
  logger.info("Fetching locations from database...");

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

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Locations fetched successfully",
    locations,
  };
};

export const getEventStatuses = async () => {
  logger.info("Fetching event statuses from database...");

  const eventStatuses = await EventStatus.findAll({
    attributes: ["event_status_id", "event_status_description"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Event statuses fetched successfully",
    eventStatuses,
  };
};

export const getLinkedEventTypes = async () => {
  logger.info("Fetching linked event types from database...");

  const linkedEventTypes = await LinkedEventType.findAll({
    attributes: [
      "linked_event_type_id",
      "linked_event_type_description",
    ],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Linked event types fetched successfully",
    linkedEventTypes,
  };
};

export const getSeasons = async () => {
  logger.info("Fetching seasons from database...");

  const seasons = await Season.findAll({
    attributes: ["season_id", "season_description"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Seasons fetched successfully",
    seasons,
  };
};

export const getReferenceDays = async () => {
  logger.info("Fetching reference days from database...");

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

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Reference days fetched successfully",
    referenceDays,
  };
};

export const getReferenceTimes = async () => {
  logger.info("Fetching reference times from database...");

  const referenceTimes = await ReferenceTime.findAll({
    attributes: ["ref_time", "is_nighttime", "is_business_hours"],
  });

  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Reference times fetched successfully",
    referenceTimes,
  };
};