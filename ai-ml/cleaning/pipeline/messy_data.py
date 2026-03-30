import pandas as pd
import numpy as np

data = {
    'event_id': [1, 2, 3, 4, 5, 3],                        # row 6 is a duplicate of row 3
    'event_type': ['Bushfire', 'FLOOD', 'bushfire', 'Severe Thunderstorm', None, 'bushfire'],
    'location': ['VIC', 'nsw', 'TAS', ' ', 'Unknown Location', 'TAS'],
    'severity': ['4', '2', '5', None, '3', '5'],            # numbers stored as strings
    'timestamp': ['2024-01-15 08:30:00', '15/02/2024', '2024-03-10 14:00:00', '7:45 p.m', None, '2024-03-10 14:00:00'],
    'cyber_threat_type': ['Phishing', 'MISINFORMATION', None, 'phishing', 'Donation Scam', None],
    'threat_url': ['http://fake-relief.com', None, 'http://scam-bushfire.org', ' ', None, 'http://scam-bushfire.org'],
    'threat_severity': ['HIGH', 'low', None, 'High', 'MEDIUM', 'low'],
}

df = pd.DataFrame(data)
df.to_csv('messy_data.csv', index=False)
print("Before cleaning:")
print(df)
print("\nShape:", df.shape)