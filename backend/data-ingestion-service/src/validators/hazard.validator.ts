export const validateHazardData = (data: any): void => {
  const requiredFields = [
    "hazard_type",
    "severity_level",
    "event_status",
    "geo_location_id",
    "start_time",
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field} is required`);
    }
  }
};