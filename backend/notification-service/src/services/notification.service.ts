import { Op, WhereOptions } from "sequelize";
import {
  CyberThreat,
  HazardEvent,
  HttpStatusCode,
  logger,
} from "@phoenix/common";
import { GetHealthDto, GetNotificationsDto } from "../dto/notification.dto";
import {
  GetHealthEntity,
  GetNotificationsEntity,
  NotificationItem,
} from "../entity/notification.entity";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_KEYWORD_LENGTH = 200;

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_EVENT_TYPES = new Set(["hazard", "cyber"]);

type NotificationSeverity = "low" | "medium" | "high" | "critical";

type ValidatedQuery = {
  keyword: string;
  severity: NotificationSeverity | "";
  eventType: "hazard" | "cyber" | "";
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
};

const badRequest = (message: string): GetNotificationsEntity => ({
  status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
  message,
  notifications: [],
  total: 0,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
});

const parseDate = (
  rawValue: string,
  fieldName: "date_from" | "date_to",
): Date | undefined => {
  const value = rawValue.trim();
  if (!value) return undefined;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const normalized = isDateOnly
    ? `${value}T${fieldName === "date_to" ? "23:59:59.999" : "00:00:00.000"}Z`
    : value;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO-8601 date or date-time`);
  }

  return parsed;
};

const validateQuery = (dto: GetNotificationsDto): ValidatedQuery => {
  const keyword = (dto.keyword || "").trim();
  const severity = (dto.severity || "").trim().toLowerCase();
  const eventType = (dto.event_type || "").trim().toLowerCase();

  if (keyword.length > MAX_KEYWORD_LENGTH) {
    throw new Error(`keyword must not exceed ${MAX_KEYWORD_LENGTH} characters`);
  }

  if (severity && !VALID_SEVERITIES.has(severity)) {
    throw new Error(
      "severity must be one of: low, medium, high, critical",
    );
  }

  if (eventType && !VALID_EVENT_TYPES.has(eventType)) {
    throw new Error("event_type must be one of: hazard, cyber");
  }

  // proto-loader supplies 0 for omitted int32 fields because defaults=true.
  // Treat 0 as omitted, but reject negative/non-integer direct gRPC values.
  const page = dto.page === undefined || dto.page === 0 ? DEFAULT_PAGE : dto.page;
  const limit =
    dto.limit === undefined || dto.limit === 0 ? DEFAULT_LIMIT : dto.limit;

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("page must be a positive integer");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const dateFrom = parseDate(dto.date_from || "", "date_from");
  const dateTo = parseDate(dto.date_to || "", "date_to");

  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    throw new Error("date_from must be earlier than or equal to date_to");
  }

  return {
    keyword,
    severity: severity as NotificationSeverity | "",
    eventType: eventType as "hazard" | "cyber" | "",
    dateFrom,
    dateTo,
    page,
    limit,
  };
};

const buildDateWhere = (dateFrom?: Date, dateTo?: Date) => {
  if (!dateFrom && !dateTo) return undefined;

  const range: Record<symbol, Date> = {};
  if (dateFrom) range[Op.gte] = dateFrom;
  if (dateTo) range[Op.lte] = dateTo;
  return range;
};

const hazardSeverityWhere = (severity: NotificationSeverity) => {
  switch (severity) {
    case "critical":
      return { [Op.gte]: 0.8 };
    case "high":
      return { [Op.gte]: 0.6, [Op.lt]: 0.8 };
    case "medium":
      return { [Op.gte]: 0.4, [Op.lt]: 0.6 };
    case "low":
    default:
      return { [Op.lt]: 0.4 };
  }
};

const normalizeHazardSeverity = (value: unknown): NotificationSeverity => {
  const numeric = Number(value);
  if (numeric >= 0.8) return "critical";
  if (numeric >= 0.6) return "high";
  if (numeric >= 0.4) return "medium";
  return "low";
};

const buildHazardWhere = (query: ValidatedQuery): WhereOptions => {
  const where: Record<string | symbol, unknown> = {};

  if (query.keyword) {
    const search = { [Op.iLike]: `%${query.keyword}%` };
    where[Op.or] = [
      { hazard_type: search },
      { text: search },
      { hazard_location: search },
      { source: search },
      { hazard_status: search },
      { alert_level: search },
    ];
  }

  if (query.severity) {
    where.hazard_severity = hazardSeverityWhere(query.severity);
  }

  const dateRange = buildDateWhere(query.dateFrom, query.dateTo);
  if (dateRange) where.created_at = dateRange;

  return where as WhereOptions;
};

const buildCyberWhere = (query: ValidatedQuery): WhereOptions => {
  const where: Record<string | symbol, unknown> = {};

  if (query.keyword) {
    const search = { [Op.iLike]: `%${query.keyword}%` };
    where[Op.or] = [
      { threat_type: search },
      { details: search },
      { source: search },
      { event_id: search },
    ];
  }

  if (query.severity) {
    where.severity = query.severity;
  }

  const dateRange = buildDateWhere(query.dateFrom, query.dateTo);
  if (dateRange) where.created_at = dateRange;

  return where as WhereOptions;
};

const hazardToNotification = (hazard: HazardEvent): NotificationItem => ({
  id: hazard.hazard_event_id,
  title: `${hazard.hazard_type || "Hazard"} alert`,
  body: hazard.text || "",
  recipient: "admin",
  severity: normalizeHazardSeverity(hazard.hazard_severity),
  event_type: "hazard",
  created_at: new Date(
    hazard.created_at || hazard.hazard_timestamp || hazard.timestamp,
  ).toISOString(),
});

const cyberToNotification = (threat: CyberThreat): NotificationItem => ({
  id: threat.threat_id,
  title: `${threat.threat_type || "Cyber"} threat`,
  body: threat.details || "",
  recipient: "admin",
  severity: String(threat.severity || "").toLowerCase(),
  event_type: "cyber",
  created_at: new Date(threat.created_at || threat.timestamp).toISOString(),
});

const compareNotifications = (
  first: NotificationItem,
  second: NotificationItem,
): number => {
  const dateDifference =
    new Date(second.created_at).getTime() - new Date(first.created_at).getTime();

  if (dateDifference !== 0) return dateDifference;

  // Stable tie-breakers make repeated requests deterministic.
  const eventTypeDifference = first.event_type.localeCompare(second.event_type);
  if (eventTypeDifference !== 0) return eventTypeDifference;

  return first.id.localeCompare(second.id);
};

export const getHealth = (_getHealthDto: GetHealthDto): GetHealthEntity => ({
  status: HttpStatusCode.HTTP_STATUS_OK,
  message: "Notification service is running",
});

export const getNotifications = async (
  dto: GetNotificationsDto,
): Promise<GetNotificationsEntity> => {
  let query: ValidatedQuery;

  try {
    query = validateQuery(dto);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid query";
    logger.warn(`Invalid notification query: ${message}`);
    return badRequest(message);
  }

  try {
    const fetchCount = query.page * query.limit;
    const includeHazards = !query.eventType || query.eventType === "hazard";
    const includeCyber = !query.eventType || query.eventType === "cyber";

    const hazardWhere = buildHazardWhere(query);
    const cyberWhere = buildCyberWhere(query);

    const [hazardCount, cyberCount, hazards, threats] = await Promise.all([
      includeHazards ? HazardEvent.count({ where: hazardWhere }) : 0,
      includeCyber ? CyberThreat.count({ where: cyberWhere }) : 0,
      includeHazards
        ? HazardEvent.findAll({
          where: hazardWhere,
          order: [
            ["created_at", "DESC"],
            ["hazard_event_id", "ASC"],
          ],
          limit: fetchCount,
        })
        : [],
      includeCyber
        ? CyberThreat.findAll({
          where: cyberWhere,
          order: [
            ["created_at", "DESC"],
            ["threat_id", "ASC"],
          ],
          limit: fetchCount,
        })
        : [],
    ]);

    const allNotifications = [
      ...hazards.map(hazardToNotification),
      ...threats.map(cyberToNotification),
    ].sort(compareNotifications);

    const offset = (query.page - 1) * query.limit;
    const notifications = allNotifications.slice(offset, offset + query.limit);
    const total = hazardCount + cyberCount;

    logger.info(
      `Fetched notifications total=${total}, page=${query.page}, limit=${query.limit}, returned=${notifications.length}`,
    );

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Notifications fetched successfully",
      notifications,
      total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    logger.error(`Error fetching notifications: ${error}`);
    throw new Error("Error fetching notifications");
  }
};
