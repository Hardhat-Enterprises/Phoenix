import csv
import random
import uuid
from datetime import datetime, timedelta, timezone

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────

EVENT_WEIGHTS = {
    "bushfire": 0.2,
    "flood": 0.25,
    "storm": 0.2,
    "cyclone": 0.1,
    "heatwave": 0.15,
    "earthquake": 0.1
}

# Structured location hierarchy (NO lat/long)
LOCATIONS = [
    ("Victoria", "Melbourne Metro", "Melbourne"),
    ("Victoria", "Barwon South West", "Geelong"),
    ("New South Wales", "Greater Sydney", "Parramatta"),
    ("New South Wales", "Hunter Region", "Newcastle"),
    ("Queensland", "South East QLD", "Brisbane"),
    ("Queensland", "Gold Coast Region", "Surfers Paradise"),
    ("South Australia", "Adelaide Metro", "Adelaide"),
    ("Western Australia", "Perth Metro", "Perth"),
    ("Tasmania", "Southern Region", "Hobart"),
    ("Northern Territory", "Top End", "Darwin")
]

# ─────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────

def weighted_event(month):
    # Seasonal logic (Australia)
    if month in [12, 1, 2]:  # Summer
        return random.choices(["bushfire", "heatwave", "storm"], weights=[0.5, 0.3, 0.2])[0]
    elif month in [6, 7, 8]:  # Winter
        return random.choices(["storm", "flood"], weights=[0.6, 0.4])[0]
    else:
        return random.choices(list(EVENT_WEIGHTS.keys()), weights=EVENT_WEIGHTS.values())[0]


def severity_level(score):
    if score >= 8.5: return "extreme"
    elif score >= 6.0: return "severe"
    elif score >= 3.5: return "moderate"
    return "minor"


def risk_label(score):
    if score >= 8: return "high"
    elif score >= 5: return "medium"
    return "low"


def random_severity():
    roll = random.random()
    if roll < 0.15: return round(random.uniform(1.0, 3.4), 1)
    elif roll < 0.45: return round(random.uniform(3.5, 5.9), 1)
    elif roll < 0.80: return round(random.uniform(6.0, 8.4), 1)
    else: return round(random.uniform(8.5, 10.0), 1)


def random_start_time():
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    return base + timedelta(days=random.randint(0, 730))


# ─────────────────────────────────────────
# IMPACT FEATURES
# ─────────────────────────────────────────

def generate_impact(severity):
    return {
        "fatalities": int(severity * random.uniform(0, 5)),
        "injuries": int(severity * random.uniform(5, 20)),
        "economic_loss_million": round(severity * random.uniform(1, 50), 2),
        "affected_population": int(severity * random.uniform(100, 10000)),
    }


# ─────────────────────────────────────────
# WEATHER GENERATION
# ─────────────────────────────────────────

def make_weather(event_type, severity):
    if event_type == "bushfire":
        temp = round(random.uniform(30, 45) + severity, 1)
        humidity = max(5, round(random.uniform(5, 30) - severity, 1))
        rainfall = round(random.uniform(0, 2), 1)

    elif event_type == "flood":
        rainfall = round(random.uniform(50, 200) + severity * 2, 1)
        temp = round(random.uniform(15, 25), 1)
        humidity = round(random.uniform(70, 100), 1)

    elif event_type == "cyclone":
        rainfall = round(random.uniform(100, 300) + severity * 5, 1)
        temp = round(random.uniform(24, 32), 1)
        humidity = round(random.uniform(80, 100), 1)

    elif event_type == "heatwave":
        temp = round(random.uniform(35, 48) + severity, 1)
        humidity = round(random.uniform(5, 25), 1)
        rainfall = 0

    else:
        temp = round(random.uniform(10, 30), 1)
        rainfall = round(random.uniform(0, 50), 1)
        humidity = round(random.uniform(30, 80), 1)

    return temp, rainfall, humidity


# ─────────────────────────────────────────
# MAIN DATA GENERATOR
# ─────────────────────────────────────────

def build_rows(total_rows=10000):
    rows = []

    for i in range(total_rows):

        start = random_start_time()
        month = start.month

        # Location selection
        state, region, suburb = random.choice(LOCATIONS)

        # Event selection (seasonal)
        event_type = weighted_event(month)

        # Relationship logic
        if event_type == "heatwave" and random.random() < 0.3:
            event_type = "bushfire"

        severity = random_severity()

        temp, rain, humidity = make_weather(event_type, severity)
        impact = generate_impact(severity)

        # Missing data simulation
        if random.random() < 0.05:
            humidity = None

        duration_hours = random.choice([6, 12, 24, 48, 72])

        row = {
            "hazard_event_id": f"HZ_{i+1:05d}",
            "integration_id": str(uuid.uuid4()),

            # Location
            "state": state,
            "region": region,
            "suburb": suburb,

            # Event info
            "event_type": event_type,
            "severity_score": severity,
            "severity_level": severity_level(severity),
            "risk_category": risk_label(severity),

            # Time
            "start_time": start.isoformat(),
            "duration_hours": duration_hours,

            # Weather
            "temperature_c": temp,
            "rainfall_mm": rain,
            "humidity_pct": humidity,

            # Impact
            **impact
        }

        rows.append(row)

    return rows


# ─────────────────────────────────────────
# EXPORT
# ─────────────────────────────────────────

def export_csv(filename="synthetic_disaster_10k.csv", total_rows=10000):
    rows = build_rows(total_rows)

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✅ Generated {total_rows} rows → {filename}")


# ─────────────────────────────────────────

if __name__ == "__main__":
    export_csv(total_rows=10000)