
"""
Created on Sun May  3 12:08:33 2026

@author: Trey

helper function for input and output functionality
such as saving and loading JSON, CSV, and YAML files, as well as managing directories and timestamps.
"""

import os
import json
import yaml
import pandas as pd
from datetime import datetime, timezone



# Directory Utilities

def ensure_dir(path: str):
    """
    Create directory if it doesn't exist.
    """
    os.makedirs(path, exist_ok=True)


def get_timestamp():
    """
    Return formatted UTC timestamp.
    """
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")



# JSON Utilities

def save_json(data: dict, file_path: str, pretty: bool = True):
    """
    Save dictionary as JSON file.
    """
    ensure_dir(os.path.dirname(file_path))

    with open(file_path, "w") as f:
        if pretty:
            json.dump(data, f, indent=4)
        else:
            json.dump(data, f)


def load_json(file_path: str):
    """
    Load JSON file into dictionary.
    """
    with open(file_path, "r") as f:
        return json.load(f)



# YAML Utilities

def save_yaml(data: dict, file_path: str):
    """
    Save dictionary as YAML file.
    """
    ensure_dir(os.path.dirname(file_path))

    with open(file_path, "w") as f:
        yaml.dump(data, f)


def load_yaml(file_path: str):
    """
    Load YAML file.
    """
    with open(file_path, "r") as f:
        return yaml.safe_load(f)



# CSV / DataFrame Utilities

def save_csv(data, file_path: str):
    """
    Save list of dicts or pandas DataFrame to CSV.
    """
    ensure_dir(os.path.dirname(file_path))

    if isinstance(data, pd.DataFrame):
        df = data
    else:
        df = pd.DataFrame(data)

    df.to_csv(file_path, index=False)


def load_csv(file_path: str):
    """
    Load CSV into pandas DataFrame.
    """
    return pd.read_csv(file_path)



# Generic Save Helper

def save_with_timestamp(data, base_dir: str, filename: str, ext: str = "json"):
    """
    Save file with timestamp appended.
    Example:
    report_20260430_153000.json
    """
    ensure_dir(base_dir)

    timestamp = get_timestamp()
    full_path = os.path.join(base_dir, f"{filename}_{timestamp}.{ext}")

    if ext == "json":
        save_json(data, full_path)
    elif ext == "yaml":
        save_yaml(data, full_path)
    elif ext == "csv":
        save_csv(data, full_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return full_path