import { Op } from "sequelize";
import {
  HttpStatusCode,
  IntegrationLog,
  IntegrationStatus,
  IntegrationType,
  logger,
} from "@phoenix/common";
import {
  GetRiskAssessmentDto,
  GetRiskAssessmentsDto,
} from "../dto/risk-assessment.dto";
import {
  GetRiskAssessmentEntity,
  GetRiskAssessmentsEntity,
} from "../entity/risk-assessment.entity";

const VALID_RISK_LEVELS = ["low", "medium", "high", "critical"];
const VALID_STATUSES = Object.values(IntegrationStatus);
const TEAVS_ALERT_PATTERN = '%"teavs_alert"%';

export const getRiskAssessments = async (
  dto: GetRiskAssessmentsDto,
): Promise<GetRiskAssessmentsEntity> => {
  try {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = Math.min(dto.limit && dto.limit > 0 ? dto.limit : 10, 100);
    const offset = (page - 1) * limit;
    const where: Record<string, any> = {
      integration_type: IntegrationType.CORE,
      output: { [Op.like]: TEAVS_ALERT_PATTERN },
    };

    if (dto.status && VALID_STATUSES.includes(dto.status as IntegrationStatus)) {
      where.status = dto.status;
    } else {
      where.status = IntegrationStatus.COMPLETED;
    }

    if (dto.risk_level) {
      const riskLevel = dto.risk_level.toLowerCase();
      if (!VALID_RISK_LEVELS.includes(riskLevel)) {
        return {
          status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
          message: "risk_level must be low, medium, high, or critical",
          risk_assessments: [],
          total: 0,
          page,
          limit,
        };
      }
      where.output = {
        [Op.like]: `%"risk_level":"${riskLevel}"%"teavs_alert"%`,
      };
    }

    const { count, rows } = await IntegrationLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Risk assessments fetched successfully",
      risk_assessments: GetRiskAssessmentsEntity.toEntity(rows),
      total: count,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`Error fetching risk assessments: ${error}`);
    throw new Error("Error fetching risk assessments");
  }
};

export const getRiskAssessment = async (
  dto: GetRiskAssessmentDto,
): Promise<GetRiskAssessmentEntity> => {
  try {
    const assessment = await IntegrationLog.findOne({
      where: {
        integration_event_id: dto.risk_assessment_id,
        integration_type: IntegrationType.CORE,
        output: { [Op.like]: TEAVS_ALERT_PATTERN },
      },
    });

    if (!assessment) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: `Risk assessment ${dto.risk_assessment_id} not found`,
      };
    }

    const [mapped] = GetRiskAssessmentsEntity.toEntity([assessment]);
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Risk assessment fetched successfully",
      risk_assessment: mapped,
    };
  } catch (error) {
    logger.error(`Error fetching risk assessment: ${error}`);
    throw new Error("Error fetching risk assessment");
  }
};
