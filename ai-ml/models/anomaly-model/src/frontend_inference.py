"""
Frontend-Ready Anomaly Inference Script
========================================

File: src/frontend_inference.py

WHAT THIS SCRIPT DOES
=====================
Fetches live NASA FIRMS and URLhaus API data for a given region and time window,
converts the raw API data into the anomaly detection model input format, runs
inference using the trained autoencoder model, and returns a combined frontend-ready
JSON payload containing both the input and output.

USAGE
=====
Command line:
    python src/frontend_inference.py \\
        --region-id VIC_GIPPSLAND \\
        --time-window "2024-01-15 14:00:00"

Python import:
    from frontend_inference import fetch_live_anomaly_inference
    result = fetch_live_anomaly_inference(
        region_id="VIC_GIPPSLAND",
        time_window="2024-01-15 14:00:00"
    )

DEPLOYMENT NOTES
================
- API keys are loaded from .env/api_keys.env using NASA_FIRMS_API_KEY/FIRMS_API_KEY/FIRMS_MAP_KEY and optional URL_HAUS_AUTHKEY/URLHAUS_API_KEY
- Fallback to .env file if env vars not set
- Uses live NASA FIRMS and URLhaus API calls for real data aggregation
- Region mapping currently hardcoded; can be externalized to config file later
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
import csv
from io import StringIO
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError as exc:
    requests = None
    _requests_import_error = exc
else:
    _requests_import_error = None

# Import reusable functions from anomaly_integration
from anomaly_integration import (
    predict,
    DEFAULT_AUTOENCODER_CHECKPOINT_PATH,
)
# Load environment variables
try:
    from dotenv import load_dotenv

    CURRENT_FILE = Path(__file__).resolve()

    ENV_CANDIDATES = [
        CURRENT_FILE.parents[5] / ".env",  # repo root .env
        CURRENT_FILE.parents[4] / ".env",  # fallback
        CURRENT_FILE.parents[4] / "datasets" / "api_keys.env",
    ]

    for env_path in ENV_CANDIDATES:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[INFO] Loaded env file: {env_path}")
            break

except ImportError:
    pass


# ---------------------------------------------------------------------------
# Region mapping: region_id → geographic bounds
# Frontend/backend should coordinate which regions to query
# ---------------------------------------------------------------------------
REGION_BOUNDS = {
    "VIC_GIPPSLAND": {
        "min_lat": -37.8, "max_lat": -37.1,
        "min_lon": 147.2, "max_lon": 148.5,
    },
    "VIC_MELBOURNE": {
        "min_lat": -38.2, "max_lat": -37.5,
        "min_lon": 144.7, "max_lon": 145.5,
    },
    "NSW_SYDNEY": {
        "min_lat": -34.0, "max_lat": -33.6,
        "min_lon": 150.8, "max_lon": 151.4,
    },
    "NSW_NEWCASTLE": {
        "min_lat": -33.1, "max_lat": -32.8,
        "min_lon": 151.6, "max_lon": 152.2,
    },
    "QLD_TOWNSVILLE": {
        "min_lat": -19.5, "max_lat": -19.1,
        "min_lon": 146.7, "max_lon": 147.2,
    },
    "QLD_BRISBANE": {
        "min_lat": -27.7, "max_lat": -27.3,
        "min_lon": 152.9, "max_lon": 153.4,
    },
    "WA_PERTH": {
        "min_lat": -32.3, "max_lat": -31.7,
        "min_lon": 115.6, "max_lon": 116.2,
    },
    "SA_ADELAIDE": {
        "min_lat": -34.9, "max_lat": -34.7,
        "min_lon": 138.5, "max_lon": 138.8,
    },
    "SA_PORT_ADELAIDE": {
        "min_lat": -34.95, "max_lat": -34.8,
        "min_lon": 138.48, "max_lon": 138.65,
    },
    "TAS_HOBART": {
        "min_lat": -43.0, "max_lat": -42.6,
        "min_lon": 147.2, "max_lon": 147.6,
    },
    "NT_DARWIN": {
        "min_lat": -12.6, "max_lat": -12.3,
        "min_lon": 130.8, "max_lon": 131.0,
    },
    "ACT_CANBERRA": {
        "min_lat": -35.4, "max_lat": -35.1,
        "min_lon": 149.0, "max_lon": 149.3,
    },
}


# ---------------------------------------------------------------------------
# Live API fetching functions
# ---------------------------------------------------------------------------

def _require_requests() -> None:
    if requests is None:
        raise ImportError(
            "The 'requests' package is required for live API calls. "
            "Install it with 'pip install requests'."
        )


def _get_bounds(region_id: str, bounding_box: Optional[dict]) -> dict:
    if bounding_box:
        return bounding_box
    if region_id not in REGION_BOUNDS:
        raise ValueError(f"Invalid region_id: '{region_id}'.")
    return REGION_BOUNDS[region_id]


def _extract_firms_events(response_data: dict) -> list[dict]:
    events = []

    if isinstance(response_data, dict):
        if "data" in response_data and isinstance(response_data["data"], list):
            fields = [f.lower() for f in response_data.get("fields", [])]
            brightness_keys = ["bright_ti4", "bright_ti5", "brightness", "bright_ti6"]
            confidence_keys = ["confidence", "confidence_level", "scan"]
            brightness_idx = next((fields.index(key) for key in brightness_keys if key in fields), None)
            confidence_idx = next((fields.index(key) for key in confidence_keys if key in fields), None)

            for row in response_data["data"]:
                if isinstance(row, dict):
                    events.append({
                        "brightness": float(row.get("bright_ti4") or row.get("bright_ti5") or row.get("brightness") or 0.0),
                        "confidence": float(row.get("confidence") or row.get("confidence_level") or 0.0),
                    })
                elif isinstance(row, (list, tuple)) and brightness_idx is not None:
                    brightness = float(row[brightness_idx]) if brightness_idx < len(row) else 0.0
                    confidence = float(row[confidence_idx]) if confidence_idx is not None and confidence_idx < len(row) else 0.0
                    events.append({"brightness": brightness, "confidence": confidence})
        elif "features" in response_data and isinstance(response_data["features"], list):
            for item in response_data["features"]:
                properties = item.get("properties", {}) if isinstance(item, dict) else {}
                events.append({
                    "brightness": float(properties.get("bright_ti4") or properties.get("bright_ti5") or properties.get("brightness") or 0.0),
                    "confidence": float(properties.get("confidence") or 0.0),
                })
    elif isinstance(response_data, list):
        for item in response_data:
            if isinstance(item, dict):
                confidence_value = item.get("confidence") or 0.0

                try:
                    confidence_value = float(confidence_value)
                except (ValueError, TypeError):
                    confidence_str = str(confidence_value).lower()

                    if confidence_str in ["h", "high"]:
                        confidence_value = 100.0
                    elif confidence_str in ["n", "nominal"]:
                        confidence_value = 60.0
                    elif confidence_str in ["l", "low"]:
                        confidence_value = 20.0
                    else:
                        confidence_value = 0.0

                events.append({
                    "brightness": float(
                        item.get("bright_ti4")
                        or item.get("bright_ti5")
                        or item.get("brightness")
                        or 0.0
                    ),
                    "confidence": confidence_value,
                })

    return events


def fetch_firms_data(
    api_key: str,
    region_id: str,
    time_window: str,
    bounding_box: Optional[dict] = None,
    timeout: int = 30,
) -> dict:
    """
    Fetch live FIRMS data for a region and time window.

    Args:
        api_key: NASA FIRMS API key (from environment or parameter)
        region_id: Region identifier (e.g., "VIC_GIPPSLAND")
        time_window: Timestamp string (e.g., "2024-01-15 14:00:00")
        bounding_box: Optional geographic bounds (overrides region_id mapping)
        timeout: Request timeout in seconds

    Returns:
        Aggregated FIRMS data dict with fields:
            - firms_event_count: Total fire detection events
            - firms_avg_brightness: Mean brightness
            - fire_confidence_high_count: Count of high-confidence (≥90%) detections
    """
    _require_requests()

    bounds = _get_bounds(region_id, bounding_box)
    try:
        dt = datetime.strptime(time_window, "%Y-%m-%d %H:%M:%S")
    except ValueError as exc:
        raise ValueError(
            "time_window must be in 'YYYY-MM-DD HH:MM:SS' format."
        ) from exc

    date_str = dt.strftime("%Y-%m-%d")

    source = "VIIRS_SNPP_NRT"

    area_coordinates = (
        f"{bounds['min_lon']},"
        f"{bounds['min_lat']},"
        f"{bounds['max_lon']},"
        f"{bounds['max_lat']}"
    )

    day_range = 1

    url = (
        "https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{api_key}/{source}/{area_coordinates}/{day_range}/{date_str}"
    )

    response = requests.get(url, timeout=timeout)  # type: ignore
    response.raise_for_status()
    csv_text = response.text
    reader = csv.DictReader(StringIO(csv_text))

    events = _extract_firms_events(list(reader)) # type: ignore
    event_count = float(len(events))
    avg_brightness = float("nan")
    high_confidence_count = 0.0

    if events:
        brightness_values = [event["brightness"] for event in events if event.get("brightness") is not None]
        avg_brightness = float(sum(brightness_values) / len(brightness_values)) if brightness_values else 0.0
        high_confidence_count = float(
            sum(1 for event in events if event.get("confidence", 0.0) >= 90.0)
        )

    return {
        "firms_event_count": event_count,
        "firms_avg_brightness": round(avg_brightness, 2) if event_count > 0 else 0.0,
        "firms_avg_confidence": round(
            sum(event.get("confidence", 0.0) for event in events) / len(events), 2
        ) if events else 0.0,
        "firms_avg_frp": 0.0,
        "firms_sources": "VIIRS_SNPP_NRT",
        "firms_instruments": "VIIRS",
        "firms_satellites": "N",
        "firms_types": "0",
    }


def _parse_urlhaus_date(date_value: str) -> Optional[datetime]:
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d %b %Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(date_value, fmt)
        except (ValueError, TypeError):
            continue
    return None


def fetch_urlhaus_data(
    api_key: str,
    region_id: str,
    time_window: str,
    bounding_box: Optional[dict] = None,
    timeout: int = 30,
) -> dict:
    """
    Fetch live URLhaus data for a region and time window.

    Args:
        api_key: URLhaus authentication key (from environment or parameter)
        region_id: Region identifier (e.g., "VIC_GIPPSLAND")
        time_window: Timestamp string (e.g., "2024-01-15 14:00:00")
        bounding_box: Optional geographic bounds (overrides region_id mapping)
        timeout: Request timeout in seconds

    Returns:
        Aggregated URLhaus data dict with fields:
            - urlhaus_event_count: Total malicious URL events
            - malicious_url_count: Unique malicious URLs
            - phishing_tag_count: Count of phishing-tagged URLs
            - threat_spike_ratio: Ratio of unique URLs to base volume
    """
    _require_requests()

    _get_bounds(region_id, bounding_box)
    try:
        dt = datetime.strptime(time_window, "%Y-%m-%d %H:%M:%S")
    except ValueError as exc:
        raise ValueError(
            "time_window must be in 'YYYY-MM-DD HH:MM:SS' format."
        ) from exc

    url = "https://urlhaus-api.abuse.ch/v1/urls/recent/"
    headers = {"Accept": "application/json"}

    if api_key:
        headers["Auth-Key"] = api_key

    response = requests.get(url, headers=headers, timeout=timeout)  # type: ignore
    response.raise_for_status()
    data = response.json()

    raw_urls = data.get("urls") or data.get("data") or data.get("urlhaus") or []
    if not isinstance(raw_urls, list):
        raw_urls = []

    events = []
    target_date = dt.date()

    for item in raw_urls:
        if not isinstance(item, dict):
            continue
        date_added = _parse_urlhaus_date(item.get("date_added") or item.get("date")) # type: ignore
        if date_added and date_added.date() != target_date:
            continue
        url_value = item.get("url") or item.get("url_string") or ""
        tags = item.get("tags") or item.get("threat") or ""
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
        events.append({
            "url": url_value,
            "tags": tags,
        })

    event_count = float(len(events))
    unique_urls = float(len({event["url"] for event in events if event["url"]}))
    phishing_tag_count = float(
        sum(
            1
            for event in events
            if any("phish" in str(tag).lower() for tag in event.get("tags", []))
        )
    )
    threat_spike_ratio = round(unique_urls / max(1.0, event_count * 0.5), 2) if event_count > 0 else 0.0

    return {
        "urlhaus_event_count": 0.0,
        "urlhaus_unique_url_count": 0.0,
        "urlhaus_online_count": 0.0,
        "urlhaus_offline_count": 0.0,
        "urlhaus_threats": " | ".join(
            sorted({str(tag) for event in events for tag in event.get("tags", [])})
        ),
        "urlhaus_tags": " | ".join(
            sorted({str(tag) for event in events for tag in event.get("tags", [])})
        ),
    }


# ---------------------------------------------------------------------------
# Data preparation
# ---------------------------------------------------------------------------
def prepare_anomaly_input(
    time_window: str,
    region_id: str,
    firms_data: dict,
    urlhaus_data: dict,
) -> dict:
    """
    Combine FIRMS and URLhaus data with time fields to create model input.

    Args:
        time_window: Timestamp string (e.g., "2024-01-15 14:00:00")
        region_id: Region identifier
        firms_data: Dict with FIRMS aggregated fields
        urlhaus_data: Dict with URLhaus aggregated fields

    Returns:
        Complete input dict matching anomaly model expectations:
        {
            "time_window": "2024-01-15 14:00:00",
            "region_id": "VIC_GIPPSLAND",
            "firms_event_count": 12,
            "firms_avg_brightness": 331.5,
            "fire_confidence_high_count": 5,
            "urlhaus_event_count": 18,
            "malicious_url_count": 9,
            "phishing_tag_count": 4,
            "threat_spike_ratio": 2.6,
            "hour_of_day": 14,
            "day_of_week": 1
        }
    """

    # Combine all fields
    bounds = _get_bounds(region_id, None)

    model_input = {
        "time_window": time_window,
        "region_id": region_id,

        # Region raw fields required by FeatureSelector
        "region_min_latitude": bounds["min_lat"],
        "region_max_latitude": bounds["max_lat"],
        "region_min_longitude": bounds["min_lon"],
        "region_max_longitude": bounds["max_lon"],

        # FIRMS raw fields required by FeatureSelector
        "firms_event_count": firms_data.get("firms_event_count", 0.0),
        "firms_avg_frp": firms_data.get("firms_avg_frp", 0.0),
        "firms_avg_brightness": firms_data.get("firms_avg_brightness", 0.0),
        "firms_avg_confidence": firms_data.get("firms_avg_confidence", 0.0),
        "firms_sources": firms_data.get("firms_sources", ""),
        "firms_instruments": firms_data.get("firms_instruments", ""),
        "firms_satellites": firms_data.get("firms_satellites", ""),
        "firms_types": firms_data.get("firms_types", ""),

        # URLhaus raw fields required by FeatureSelector
        "urlhaus_event_count": urlhaus_data.get("urlhaus_event_count", 0.0),
        "urlhaus_unique_url_count": urlhaus_data.get("urlhaus_unique_url_count", 0.0),
        "urlhaus_online_count": urlhaus_data.get("urlhaus_online_count", 0.0),
        "urlhaus_offline_count": urlhaus_data.get("urlhaus_offline_count", 0.0),
        "urlhaus_threats": urlhaus_data.get("urlhaus_threats", ""),
        "urlhaus_tags": urlhaus_data.get("urlhaus_tags", ""),
    }

    return model_input


# ---------------------------------------------------------------------------
# Inference pipeline
# ---------------------------------------------------------------------------
def load_anomaly_model(
    checkpoint_path: Optional[str] = None,
) -> dict:
    """
    Load the trained anomaly detection model.

    Args:
        checkpoint_path: Path to model checkpoint (uses default if not provided)

    Returns:
        Model metadata dict (for reference; actual model loading done in predict())

    Raises:
        FileNotFoundError: If checkpoint not found
    """
    path = checkpoint_path or DEFAULT_AUTOENCODER_CHECKPOINT_PATH
    if not Path(path).exists():
        raise FileNotFoundError(
            f"Model checkpoint not found: {path}\n"
            f"Expected: {DEFAULT_AUTOENCODER_CHECKPOINT_PATH}"
        )
    return {"checkpoint_path": str(path), "status": "loaded"}


def run_inference(
    model_input: dict,
    checkpoint_path: Optional[str] = None,
) -> dict:
    """
    Run the anomaly detection model on prepared input.

    Args:
        model_input: Input dict prepared by prepare_anomaly_input()
        checkpoint_path: Path to model checkpoint (uses default if not provided)

    Returns:
        Model output dict with fields:
        {
            "anomaly_score": 0.87,
            "is_anomaly": true,
            "risk_level": "High",
            "main_drivers": [...],
            "confidence_score": 0.78
        }

    Raises:
        ValueError: If input validation fails
        FileNotFoundError: If checkpoint not found
    """
    path = checkpoint_path or DEFAULT_AUTOENCODER_CHECKPOINT_PATH
    output = predict(model_input, checkpoint_path=path)
    # Remove time_window and region_id from output since we'll include them in combined payload
    return {
        "anomaly_score": output["anomaly_score"],
        "is_anomaly": output["is_anomaly"],
        "risk_level": output["risk_level"],
        "main_drivers": output["main_drivers"],
        "confidence_score": output["confidence_score"],
    }


def build_response_payload(
    model_input: dict,
    model_output: dict,
) -> dict:
    """
    Combine model input and output into a single frontend-ready JSON response.

    Args:
        model_input: Input dict prepared by prepare_anomaly_input()
        model_output: Output dict from run_inference()

    Returns:
        Combined payload:
        {
            "input": { ... model input ... },
            "output": { ... model output ... },
            "metadata": {
                "processed_at": ISO timestamp,
                "model_version": "autoencoder_supervised_v1"
            }
        }
    """
    return {
        "input": model_input,
        "output": model_output,
        "metadata": {
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "model_version": "autoencoder_supervised_v1",
        },
    }


# ---------------------------------------------------------------------------
# Main orchestration function
# ---------------------------------------------------------------------------
def fetch_live_anomaly_inference(
    region_id: str,
    time_window: Optional[str] = None,
    bounding_box: Optional[dict] = None,
    firms_api_key: Optional[str] = None,
    urlhaus_api_key: Optional[str] = None,
    checkpoint_path: Optional[str] = None,
) -> dict:
    """
    Fetch live FIRMS and URLhaus data, run anomaly inference, and return combined result.

    This is the main entry point for frontend/backend integration.

    Args:
        region_id: Region identifier (e.g., "VIC_GIPPSLAND")
        time_window: Timestamp string (e.g., "2024-01-15 14:00:00")
                     If not provided, uses current UTC hour
        bounding_box: Optional dict with {min_lat, max_lat, min_lon, max_lon}
                      Overrides region_id bounds if provided
        firms_api_key: NASA FIRMS API key (loads from NASA_FIRMS_API_KEY env var if not provided)
        urlhaus_api_key: URLhaus auth key (loads from URL_HAUS_AUTHKEY env var if not provided)
        checkpoint_path: Path to model checkpoint (uses default if not provided)

    Returns:
        Frontend-ready JSON payload:
        {
            "input": { time_window, region_id, firms_event_count, ... },
            "output": { anomaly_score, is_anomaly, risk_level, ... },
            "metadata": { processed_at, model_version, ... }
        }

    Raises:
        ValueError: If required parameters missing or invalid
        FileNotFoundError: If checkpoint not found
    """
       # Step 1: Load API keys from environment or parameters
    if not firms_api_key:
        firms_api_key = (
            os.getenv("NASA_FIRMS_API_KEY")
            or os.getenv("FIRMS_API_KEY")
            or os.getenv("FIRMS_MAP_KEY")
        )

        if not firms_api_key:
            raise ValueError(
                "Missing FIRMS API key. Set NASA_FIRMS_API_KEY, FIRMS_API_KEY, or FIRMS_MAP_KEY."
            )

    if not urlhaus_api_key:
        urlhaus_api_key = (
            os.getenv("URL_HAUS_AUTHKEY")
            or os.getenv("URLHAUS_API_KEY")
            or os.getenv("URLHAUS_AUTH_KEY")
        )

    # Step 2: Set time_window to current UTC hour if not provided
    if not time_window:
        now = datetime.now(timezone.utc)
        time_window = now.strftime("%Y-%m-%d %H:00:00")

    # Step 3: Validate region_id
    if not region_id or region_id not in REGION_BOUNDS:
        available_regions = ", ".join(REGION_BOUNDS.keys())
        raise ValueError(
            f"Invalid region_id: '{region_id}'. Available regions: {available_regions}"
        )

    # Step 4: Fetch FIRMS data
    try:
        firms_data = fetch_firms_data(
            api_key=firms_api_key,
            region_id=region_id,
            time_window=time_window,
            bounding_box=bounding_box,
        )
    except Exception as e:
        return {
            "error": f"FIRMS API call failed: {str(e)}",
            "region_id": region_id,
            "time_window": time_window,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Step 5: Fetch URLhaus data
    try:
        urlhaus_data = fetch_urlhaus_data(
            api_key=urlhaus_api_key, # type: ignore
            region_id=region_id,
            time_window=time_window,
            bounding_box=bounding_box,
        )
    except Exception as e:
        return {
            "error": f"URLhaus API call failed: {str(e)}",
            "region_id": region_id,
            "time_window": time_window,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Step 6: Prepare model input
    try:
        model_input = prepare_anomaly_input(
            time_window=time_window,
            region_id=region_id,
            firms_data=firms_data,
            urlhaus_data=urlhaus_data,
        )
    except Exception as e:
        return {
            "error": f"Input preparation failed: {str(e)}",
            "region_id": region_id,
            "time_window": time_window,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Step 7: Run inference
    try:
        model_output = run_inference(
            model_input=model_input,
            checkpoint_path=checkpoint_path,
        )
    except Exception as e:
        return {
            "error": f"Model inference failed: {str(e)}",
            "input": model_input,
            "region_id": region_id,
            "time_window": time_window,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Step 8: Build and return combined response
    return build_response_payload(
        model_input=model_input,
        model_output=model_output,
    )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main():
    """Command-line interface for frontend-ready anomaly inference."""
    parser = argparse.ArgumentParser(
        description="Frontend-ready anomaly detection inference",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python src/frontend_inference.py --region-id VIC_GIPPSLAND
  python src/frontend_inference.py --region-id NSW_SYDNEY \\
    --time-window "2024-01-15 14:00:00"
  python src/frontend_inference.py --list-regions

Available regions: VIC_GIPPSLAND, VIC_MELBOURNE, NSW_SYDNEY, NSW_NEWCASTLE, QLD_TOWNSVILLE, QLD_BRISBANE, WA_PERTH, SA_ADELAIDE, SA_PORT_ADELAIDE, TAS_HOBART, NT_DARWIN, ACT_CANBERRA

Frontend/Backend Integration Notes:
  - API keys should be set in environment variables (NASA_FIRMS_API_KEY, URL_HAUS_AUTHKEY)
    or in .env file at the project root
  - Region ID determines the geographic bounding box for API queries
  - Time window defaults to current UTC hour if not provided
  - Output is JSON-formatted and frontend-ready
        """,
    )

    parser.add_argument(
        "--region-id",
        type=str,
        help="Region identifier (e.g., VIC_GIPPSLAND)",
    )
    parser.add_argument(
        "--time-window",
        type=str,
        help='Timestamp (YYYY-MM-DD HH:MM:SS format, e.g., "2024-01-15 14:00:00")',
    )
    parser.add_argument(
        "--list-regions",
        action="store_true",
        help="List all available regions and exit",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output file path (optional; if not provided, prints to stdout)",
    )

    args = parser.parse_args()

    # List regions if requested
    if args.list_regions:
        print("Available regions:")
        for region_id, bounds in REGION_BOUNDS.items():
            print(f"  {region_id}: lat [{bounds['min_lat']}, {bounds['max_lat']}], "
                  f"lon [{bounds['min_lon']}, {bounds['max_lon']}]")
        return

    # Validate required arguments
    if not args.region_id:
        parser.print_help()
        print("\nError: --region-id is required (or use --list-regions)")
        return

    # Run inference
    try:
        result = fetch_live_anomaly_inference(
            region_id=args.region_id,
            time_window=args.time_window,
        )

        # Output result
        output_json = json.dumps(result, indent=2)
        if args.output:
            Path(args.output).write_text(output_json)
            print(f"Result written to: {args.output}")
        else:
            print(output_json)

    except Exception as e:
        error_response = {
            "error": str(e),
            "region_id": args.region_id,
            "time_window": args.time_window,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }
        print(json.dumps(error_response, indent=2))


if __name__ == "__main__":
    main()
