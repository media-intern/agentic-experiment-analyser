import pandas as pd
from typing import List, Dict
from config.config_manager import load_system_config

def filter_metrics_for_display(df: pd.DataFrame, system: str) -> List[Dict]:
    """
    Clean, sort, and reformat the metric table for UI display.
    Important metrics (from system_config.yaml) are shown first.
    """
    config = load_system_config()
    important_metrics = config.get('important_metrics', [])
    # If system-specific, use config.get(system, {}).get('important_metrics', [])

    # Ensure all columns are stripped of whitespace
    df = df.rename(columns=lambda x: x.strip() if isinstance(x, str) else x)

    # Sort columns: important metrics first, then the rest
    all_cols = list(df.columns)
    sorted_cols = [m for m in important_metrics if m in all_cols] + [c for c in all_cols if c not in important_metrics]
    df = df[sorted_cols]

    # Round all float columns to 2 decimals
    for col in df.select_dtypes(include=['float', 'int']).columns:
        df[col] = df[col].round(2)

    # Return as list of dicts
    return df.to_dict(orient='records') 