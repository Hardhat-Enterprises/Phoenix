from __future__ import annotations

import argparse
from pathlib import Path

from src.config import DEFAULT_HAZARD_COUNT, DEFAULT_THREAT_COUNT, DEFAULT_INTEGRATION_COUNT, DEFAULT_SEED
from src.generator import generate_hazard_events, generate_cyber_threats, generate_integrations, build_sample_output
from src.utils import ensure_dir, save_json, save_csv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic AI005 social media and misinformation files.")
    parser.add_argument("--hazards", type=int, default=DEFAULT_HAZARD_COUNT)
    parser.add_argument("--threats", type=int, default=DEFAULT_THREAT_COUNT)
    parser.add_argument("--integrations", type=int, default=DEFAULT_INTEGRATION_COUNT)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=str, default="data")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir = Path(args.output)
    ensure_dir(out_dir)

    hazards = generate_hazard_events(count=args.hazards, seed=args.seed)
    threats = generate_cyber_threats(hazards, count=args.threats, seed=args.seed)
    integrations = generate_integrations(hazards, threats, count=args.integrations, seed=args.seed)
    sample_rows = build_sample_output(threats, sample_count=min(100, len(threats)))

    save_json(out_dir / "hazard_event_samples.json", hazards)
    save_json(out_dir / "cyber_threat_samples.json", threats)
    save_json(out_dir / "risk_assessment_integration.json", integrations)
    save_csv(out_dir / "social_media_misinformation_sample_output.csv", sample_rows)

    print(f"Hazard records: {len(hazards)}")
    print(f"Threat records: {len(threats)}")
    print(f"Integration records: {len(integrations)}")
    print(f"Sample output rows: {len(sample_rows)}")
    print(f"Generated files saved to: {out_dir.resolve()}")


if __name__ == "__main__":
    main()
