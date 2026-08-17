export class GetIntegrationsDto {
  from?: number;
  to?: number;
  page?: number;
  limit?: number;
}

export class GetIntegrationDto {
  integration_event_id: string;
}
