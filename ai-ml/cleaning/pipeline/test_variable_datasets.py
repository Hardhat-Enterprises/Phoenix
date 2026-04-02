import pandas as pd
from cleaning_pipeline import load_config, run_pipeline, verify_clean_data


hazard_data = {
    'event_id': ['UUID-1', 'UUID-2', 'UUID-3', 'UUID-1'],
    'event_type': ['BUSHFIRE', 'flood', None, 'BUSHFIRE'],
    'severity': ['HIGH', 'extreme', 'low', 'HIGH'], # 'extreme' is invalid per schema
    'timestamp': ['2024-01-15 08:30', '15/02/2024', None, '2024-01-15 08:30'],
}
pd.DataFrame(hazard_data).to_csv('messy_hazards.csv', index=False)


threat_data = {
    'id': [101, 102, 103, 103],
    'type_of_threat': ['DDOS', 'phishing', 'Ransomware', 'Ransomware'],
    'risk': ['CRITICAL', 'minor', 'high', 'high'], # 'minor' is invalid per schema
    'time_detected': ['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-03']
}
pd.DataFrame(threat_data).to_csv('messy_threats.csv', index=False)


print("\n>>> TESTING HAZARD DATASET <<<")
hazard_df = pd.read_csv('messy_hazards.csv')
hazard_cfg = load_config('hazard_config.yaml')
clean_hazards = run_pipeline(hazard_df, hazard_cfg)
verify_clean_data(clean_hazards)


print("\n>>> TESTING CYBER THREAT DATASET <<<")
threat_df = pd.read_csv('messy_threats.csv')
threat_cfg = load_config('threat_config.yaml')
clean_threats = run_pipeline(threat_df, threat_cfg)
verify_clean_data(clean_threats)