export class GetRiskAssessmentsDto {
  risk_level?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class GetRiskAssessmentDto {
  risk_assessment_id: string;
}
