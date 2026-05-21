import pandas as pd

def load_disaster_dataset():
    return pd.DataFrame({
        "timestamp": ["2026-01-01", "2026-01-02"],
        "location": ["VIC", "NSW"],
        "severity": [3, 8],
        "duration_hours": [2, 6]
    })


def load_cyber_dataset():
    return pd.DataFrame({
        "timestamp": ["2026-01-01", "2026-01-02"],
        "location": ["VIC", "NSW"],
        "cyber_incidents": [10, 30]
    })


def load_weather_dataset():
    return pd.DataFrame({
        "timestamp": ["2026-01-01", "2026-01-02"],
        "location": ["VIC", "NSW"],
        "rainfall": [12, 40],
        "temperature": [25, 18]
    })


def load_geo_dataset():
    return pd.DataFrame({
        "location": ["VIC", "NSW"],
        "population_density": [200, 500]
    })


def load_infrastructure_dataset():
    return pd.DataFrame({
        "location": ["VIC", "NSW"],
        "critical_sites": [5, 12]
    })


def load_social_dataset():
    return pd.DataFrame({
        "timestamp": ["2026-01-01", "2026-01-02"],
        "location": ["VIC", "NSW"],
        "social_alerts": [2, 7]
    })