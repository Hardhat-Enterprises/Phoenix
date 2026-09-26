import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import {
  GetRiskAssessmentDto,
  GetRiskAssessmentsDto,
} from "../dto/risk-assessment.dto";
import {
  GetRiskAssessmentEntity,
  GetRiskAssessmentsEntity,
} from "../entity/risk-assessment.entity";
import {
  getRiskAssessment,
  getRiskAssessments,
} from "../services/risk-assessment.service";

export const riskAssessmentHandler = {
  GetRiskAssessments: async (
    call: ServerUnaryCall<GetRiskAssessmentsDto, GetRiskAssessmentsEntity>,
    callback: sendUnaryData<GetRiskAssessmentsEntity>,
  ) => {
    try {
      callback(null, await getRiskAssessments(call.request));
    } catch (error) {
      callback({ code: 13, message: String(error) });
    }
  },

  GetRiskAssessment: async (
    call: ServerUnaryCall<GetRiskAssessmentDto, GetRiskAssessmentEntity>,
    callback: sendUnaryData<GetRiskAssessmentEntity>,
  ) => {
    try {
      callback(null, await getRiskAssessment(call.request));
    } catch (error) {
      callback({ code: 13, message: String(error) });
    }
  },
};
