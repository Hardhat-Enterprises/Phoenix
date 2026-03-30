import pandas as pd
import numpy as np
import yaml
import sys

def load_data(file_path):
    try:
        df = pd.read_csv(file_path)
        print(df.head())
        return df
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found")
        sys.exit(1)
    except pd.errors.EmptyDataError:
        print(f"Error: The file '{file_path}' is empty")
    except pd.errors.ParserError as e:
        print(f"Error parsing file '{file_path}': {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def load_config(config_path):
    try:
        with open(config_path, 'r') as file:
            data = yaml.safe_load(file)
        print("Config file has been successfully loaded")
        return data

    except FileNotFoundError:
        print(f"File wasnt found: {config_path}")
    except yaml.YAMLError as exc:
        print(f"Error parsing YAML file: {exc}")

def handle_missing_values(df, config):
    initial_rows = len(df)
    columns_to_drop = config['missing_values']['drop']
    columns_to_fill = config['missing_values']['fill']

    df = df.replace(r'^\s*$', np.nan, regex=True)

    df = df.dropna(subset = columns_to_drop)
    df = df.fillna(value=columns_to_fill)

    dropped = initial_rows - len(df)
    print(f"[LOG] handle_missing_values: Dropped {dropped} rows containing nulls in critical columns.")

    return df

def handle_duplicates(df, config):
    initial_rows = len(df)
    columns_with_duplicates = config['duplicates']['subset']

    df = df.drop_duplicates(subset=columns_with_duplicates, keep='first')

    removed = initial_rows - len(df)
    print(f"[LOG] handle_duplicates: Removed {removed} duplicate rows based on {columns_with_duplicates}.")
    return df

def handle_type_conversion(df, config):

    initial_nulls = df.isnull().sum().sum()

    colulmns_to_int = config['type_conversion']['int']

    for col in colulmns_to_int:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    columns_to_time = config['type_conversion']['datetime']
    for col in columns_to_time:
        df[col] = pd.to_datetime(df[col], format='mixed', errors = 'coerce')

    new_nulls = df.isnull().sum().sum() - initial_nulls
    if new_nulls > 0:
        print(f"[LOG] handle_type_conversion: {new_nulls} invalid values were coerced to NULL/NaT.")
    return df

def handle_string_standardisation(df,config):
    columns_to_standardise = config['string_standardisation']
    for col in columns_to_standardise:
        df[col] =df[col].str.strip().str.capitalize()
    return df

def verify_clean_data(df):
    print("--- Null Values ---")
    print(df.isnull().sum())
    print("\n--- Data Info ---")
    df.info()
    print("\n--- Statistics ---")
    print(df.describe())

def run_pipeline(df,config):
    print("Starting pipeline...")
    start_rows = len(df)

    df = handle_type_conversion(df, config)
    df = handle_missing_values(df, config)
    df = handle_duplicates(df, config)
    df = handle_string_standardisation(df, config)

    end_rows = len(df)
    print("Pipeline sequence complete.")
    return df


if __name__ == "__main__":
    raw_df = load_data('messy_data.csv')
    pipeline_config = load_config('config.yaml')

    cleaned_df = run_pipeline(raw_df, pipeline_config)

    verify_clean_data(cleaned_df)
    cleaned_df.to_csv('cleaned_data.csv', index=False)
    print("Cleaning Complete")



    

