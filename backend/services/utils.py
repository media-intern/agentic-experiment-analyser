import pandas as pd
from typing import List
import re
import logging

logger = logging.getLogger(__name__)

def enhance_with_percentage_changes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enhances the dataframe with percentage changes for all buckets relative to control.
    Control bucket is identified using defined patterns, and all other buckets are compared against it.
    Returns a restructured dataframe with metrics as rows and buckets as columns.
    """
    try:
        if 'Experiment Tokens' not in df.columns:
            logger.warning("No 'Experiment Tokens' column found in dataframe")
            return df

        control_keywords = ["control", "ctrl", "default", "def", "0", "-ctrl"]
        metrics = [
            "Bid Price (HB Rendered Ad)",
            "Bidder Win Rate (1K)",
            "Bidder Rev Rate (10M)",
            "MNET Rev Rate (10M)",
            "Profit (HB Rendered Ad)",
        ]
        prettify_dollar = ["Bid Price (HB Rendered Ad)", "Profit (HB Rendered Ad)"]
        prettify_2dec = ["Bidder Win Rate (1K)", "Bidder Rev Rate (10M)", "MNET Rev Rate (10M)"]

        def control_score(token: str) -> int:
            token = str(token).lower()
            score = 0
            for kw in control_keywords:
                if token == kw:
                    score += 100
                if kw == '0' and re.search(r'[:_\-]0$', token):
                    score += 50
                if re.search(rf'(^|[:_\-]){re.escape(kw)}($|[:_\-])', token):
                    score += 20
                if kw in token:
                    score += 5
            return score

        # Score all rows and identify control bucket
        scores = df['Experiment Tokens'].astype(str).apply(control_score)
        if scores.max() == 0:
            logger.warning("No control bucket identified in the data")
            return df

        control_idx = scores.idxmax()
        control_bucket = df.loc[control_idx, 'Experiment Tokens']
        logger.info(f"Identified control bucket: {control_bucket}")

        # Create a new dataframe to store the restructured data
        result_rows = []
        
        # Process each metric
        for metric in metrics:
            metric_data = df[df['name'] == metric]
            if metric_data.empty:
                logger.warning(f"No data found for metric: {metric}")
                continue

            try:
                # Get control value
                control_value = metric_data[metric_data['Experiment Tokens'] == control_bucket]['value'].iloc[0]
                
                # Create a row for this metric
                row_data = {
                    'name': metric,
                    'control': control_value
                }

                # Add values and changes for each bucket
                for _, bucket_data in metric_data.iterrows():
                    bucket_name = bucket_data['Experiment Tokens']
                    if bucket_name != control_bucket:
                        value = bucket_data['value']
                        try:
                            change = ((value - control_value) / abs(control_value) * 100) if control_value != 0 else 0
                        except (TypeError, ValueError) as e:
                            logger.error(f"Error calculating change for {metric} in {bucket_name}: {str(e)}")
                            change = 0
                        
                        row_data[bucket_name] = value
                        row_data[f'{bucket_name}_change'] = change

                result_rows.append(row_data)
            except Exception as e:
                logger.error(f"Error processing metric {metric}: {str(e)}")
                continue

        # Convert to DataFrame and format values
        result_df = pd.DataFrame(result_rows)
        
        # Format dollar values
        for col in result_df.columns:
            if col != 'name' and col != 'control' and not col.endswith('_change'):
                try:
                    if col in prettify_dollar:
                        result_df[col] = result_df[col].apply(lambda x: f'${float(x):,.2f}' if pd.notnull(x) else '-')
                    elif col in prettify_2dec:
                        result_df[col] = result_df[col].apply(lambda x: f'{float(x):.2f}' if pd.notnull(x) else '-')
                except Exception as e:
                    logger.error(f"Error formatting column {col}: {str(e)}")

        # Format control values
        for metric in prettify_dollar:
            mask = result_df['name'] == metric
            try:
                result_df.loc[mask, 'control'] = result_df.loc[mask, 'control'].apply(lambda x: f'${float(x):,.2f}' if pd.notnull(x) else '-')
            except Exception as e:
                logger.error(f"Error formatting control value for {metric}: {str(e)}")

        for metric in prettify_2dec:
            mask = result_df['name'] == metric
            try:
                result_df.loc[mask, 'control'] = result_df.loc[mask, 'control'].apply(lambda x: f'{float(x):.2f}' if pd.notnull(x) else '-')
            except Exception as e:
                logger.error(f"Error formatting control value for {metric}: {str(e)}")

        # Format percentage changes
        for col in result_df.columns:
            if col.endswith('_change'):
                try:
                    result_df[col] = result_df[col].apply(lambda x: f'{float(x):+.2f}%' if pd.notnull(x) else '-')
                except Exception as e:
                    logger.error(f"Error formatting percentage change for {col}: {str(e)}")

        logger.info("Successfully enhanced dataframe with percentage changes")
        return result_df

    except Exception as e:
        logger.error(f"Error in enhance_with_percentage_changes: {str(e)}")
        return df 