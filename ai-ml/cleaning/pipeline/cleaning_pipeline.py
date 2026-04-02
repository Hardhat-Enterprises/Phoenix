import pandas as pd
import numpy as np
import yaml
import sys

def load_data(file_path):
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        sys.exit(1)

def load_config(config_path):
    try:
        with open(config_path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as exc:
        print(f"Error loading {config_path}: {exc}")
        sys.exit(1)

def apply_schema_mapping(df, config):
    if 'schema_mapping' in config:
        mapping = config['schema_mapping']

        rename_dict = {k: v for k, v in mapping.items() if k in df.columns}
        df = df.rename(columns=rename_dict)
        print(f"[LOG] Mapped columns to schema: {rename_dict}")
    return df

def handle_missing_values(df, config):
    if 'missing_values' not in config: return df
    
    df = df.replace(r'^\s*$', np.nan, regex=True)
    
    if 'drop' in config['missing_values']:
        cols = [c for c in config['missing_values']['drop'] if c in df.columns]
        df = df.dropna(subset=cols)
        
    if 'fill' in config['missing_values']:
        for col, val in config['missing_values']['fill'].items():
            if col not in df.columns:
                df[col] = val # Create column if it doesn't exist
            else:
                df[col] = df[col].fillna(val)
    return df

def handle_duplicates(df, config):
    if 'duplicates' in config and 'subset' in config['duplicates']:
        cols = [c for c in config['duplicates']['subset'] if c in df.columns]
        if cols:
            df = df.drop_duplicates(subset=cols, keep='first')
    return df

def handle_type_conversion(df, config):
    if 'type_conversion' not in config: return df
    
    if 'int' in config['type_conversion']:
        for col in config['type_conversion']['int']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                
    if 'datetime' in config['type_conversion']:
        for col in config['type_conversion']['datetime']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce')
    return df

def handle_string_standardisation(df, config):
    if 'string_standardisation' not in config: return df
    
    rules = config['string_standardisation']
    if 'lower' in rules:
        for col in rules['lower']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.lower()
                
    if 'capitalize' in rules:
        for col in rules['capitalize']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.capitalize()
    return df

def enforce_validation(df, config):
    if 'validation' not in config: return df
    
    for col, allowed_values in config['validation'].items():
        if col in df.columns:

            invalid_mask = ~df[col].isin(allowed_values)
            invalid_count = invalid_mask.sum()
            if invalid_count > 0:
                print(f"[LOG] Validation: Coerced {invalid_count} invalid values in '{col}' to NaN.")
                df.loc[invalid_mask, col] = np.nan
    return df

def run_pipeline(df, config):
    print(f"\n--- Starting Pipeline for: {config.get('dataset_type', 'Unknown')} ---")
    df = apply_schema_mapping(df, config)
    df = handle_type_conversion(df, config)
    df = handle_string_standardisation(df, config)
    df = enforce_validation(df, config)
    df = handle_missing_values(df, config)
    df = handle_duplicates(df, config)
    return df

def verify_clean_data(df):
    print("\n--- Final Cleaned Data ---")
    print(df.head())
    print(f"\nShape: {df.shape}")