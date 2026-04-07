import pandas as pd
import numpy as np
import json

def load_config(config_path):

    with open(config_path, 'r') as file:
        return json.load(file)

def apply_schema_mapping(df, mapping):

    return df.rename(columns=mapping)

def enforce_type_conversion(df, conversions):

    if 'datetime' in conversions:
        for col in conversions['datetime']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce')
    
    if 'int' in conversions:
        for col in conversions['int']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                
    return df

def apply_string_standardisation(df, standardisation):

    if 'lower' in standardisation:
        for col in standardisation['lower']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.lower().str.strip()
                
    if 'capitalize' in standardisation:
        for col in standardisation['capitalize']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.capitalize().str.strip()
                
    return df

def enforce_validation(df, validation_rules):

    for col, valid_values in validation_rules.items():
        if col in df.columns:
            df.loc[~df[col].isin(valid_values), col] = np.nan
    return df

def handle_missing_values(df, missing_rules):

    if 'drop' in missing_rules:
        df = df.dropna(subset=[col for col in missing_rules['drop'] if col in df.columns])
        
    if 'fill' in missing_rules:
        for col, fill_val in missing_rules['fill'].items():
            if col in df.columns:
                df[col] = df[col].fillna(fill_val)
                
    return df

def remove_duplicates(df, duplicate_rules):

    if 'subset' in duplicate_rules:
        subset_cols = [col for col in duplicate_rules['subset'] if col in df.columns]
        df = df.drop_duplicates(subset=subset_cols)
    return df

def run_pipeline(df, config_path, dataset_type):

    full_config = load_config(config_path)
    
    if dataset_type not in full_config:
        raise ValueError(f"Dataset type '{dataset_type}' not found in configuration.")
        
    config = full_config[dataset_type]
    
    df = apply_schema_mapping(df, config.get('schema_mapping', {}))
    df = apply_string_standardisation(df, config.get('string_standardisation', {}))
    df = enforce_type_conversion(df, config.get('type_conversion', {}))
    df = enforce_validation(df, config.get('validation', {}))
    df = handle_missing_values(df, config.get('missing_values', {}))
    df = remove_duplicates(df, config.get('duplicates', {}))
    
    return df