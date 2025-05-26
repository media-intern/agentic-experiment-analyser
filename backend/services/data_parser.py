import pandas as pd
import yaml
import logging
from typing import Dict, Any, List
from config.config_manager import CONFIG_DIR
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_metric_config():
    metric_config_path = os.path.join(CONFIG_DIR, "metric_config.yaml")
    if not os.path.exists(metric_config_path):
        raise FileNotFoundError(f"Config file not found: {metric_config_path}")
    with open(metric_config_path) as f:
        return yaml.safe_load(f)

def get_known_metrics():
    try:
        metric_config = load_metric_config()
        return list(metric_config.keys()) + ["Net Profit", "Cost"]
    except Exception as e:
        logger.warning(f"Could not load metric config: {e}")
        return ["Net Profit", "Cost"]

extracted_rows = []

def extract_deepest_data(data, path=None):
    if path is None:
        path = []
    if 'split' not in data:
        final_data = {**dict(path), **data}
        extracted_rows.append(final_data)
        return
    for sub_data in data['split']:
        current_path = path + [(k, v) for k, v in data.items() if not isinstance(v, (dict, list))]
        extract_deepest_data(sub_data, current_path)

def parse_response_json(response_data: Dict[str, Any]) -> pd.DataFrame:
    import json
    print("Raw API Response:", json.dumps(response_data, indent=2))

    if "result" not in response_data:
        raise ValueError("No 'result' found in response")

    try:
        logger.info("Starting response parsing")
        # Extract the result from the response
        if not isinstance(response_data, dict):
            logger.error(f"Invalid response format. Expected dict, got {type(response_data)}")
            raise ValueError("Invalid response format")
        result = response_data.get('result', {})
        if not result:
            logger.error("No 'result' found in response")
            logger.error(f"Full response with missing 'result': {json.dumps(response_data, indent=2)}")
            raise ValueError("No 'result' found in response")
        # Reset the global extracted_rows list
        global extracted_rows
        extracted_rows = []
        # Extract data using the existing function
        extract_deepest_data(result)
        if not extracted_rows:
            logger.error("No data extracted from response")
            raise ValueError("No data extracted from response")
        logger.info(f"Extracted {len(extracted_rows)} records from response")
        # Convert to DataFrame
        try:
            df = pd.DataFrame(extracted_rows)
            logger.info(f"Created DataFrame with columns: {df.columns.tolist()}")
        except Exception as e:
            logger.error(f"Error creating DataFrame: {str(e)}")
            raise
        # Clean column names
        df.columns = [str(col).strip() for col in df.columns]
        logger.info("Cleaned column names")
        # Handle missing values
        df = df.fillna(0)
        logger.info("Handled missing values")
        return df
    except Exception as e:
        logger.error(f"Error in parse_response_json: {str(e)}")
        raise

# import pandas as pd
# from typing import Any, Dict

# def parse_response_json(response_json: Dict[str, Any]) -> pd.DataFrame:
#     """
#     Parses Konom response JSON and returns a clean DataFrame.
#     Assumes response['result']['split'] is a list of metric row dictionaries.
#     """
#     try:
#         result = response_json.get("result", {})
#         if not result or "split" not in result:
#             raise ValueError("Missing 'split' in response['result']")

#         split_data = result["split"]
#         if not isinstance(split_data, list):
#             raise ValueError("'split' should be a list of dicts")

#         df = pd.DataFrame(split_data)

#         # Optional: round numeric columns to 2 decimal places
#         for col in df.columns:
#             if pd.api.types.is_numeric_dtype(df[col]):
#                 df[col] = df[col].round(2)

#         if 'Total Requests Sent' in df.columns:
#             df['Total Requests Sent'] = pd.to_numeric(df['Total Requests Sent'], errors='coerce').fillna(0)
#             df['Cost'] = 0.025 * df['Total Requests Sent'] / 1_000_000
#         else:
#             df['Cost'] = 0.0

#         return df

#     except Exception as e:
#         raise ValueError(f"Failed to parse response JSON: {e}")
