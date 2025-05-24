import pandas as pd
import logging
from typing import Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    try:
        logger.info("Starting dataframe preprocessing")
        logger.info(f"Initial columns: {df.columns.tolist()}")
        
        # Strip whitespace from column names
        df = df.rename(columns=lambda x: x.strip() if isinstance(x, str) else x)
        logger.info("Stripped whitespace from column names")

        # Convert numeric columns to float type
        numeric_columns = df.select_dtypes(include=['float', 'int']).columns
        logger.info(f"Numeric columns found: {numeric_columns.tolist()}")
        
        for col in numeric_columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                logger.info(f"Converted column {col} to numeric")
            except Exception as e:
                logger.error(f"Error converting column {col} to numeric: {str(e)}")
                raise

        # Add Cost column (if 'Total Requests Sent' exists)
        if 'Total Requests Sent (HB Provider Response)' in df.columns:
            try:
                df['Cost'] = df['Total Requests Sent (HB Provider Response)'].astype(float) * 0.025 / 1_000_000
                logger.info("Added Cost column")
            except Exception as e:
                logger.error(f"Error calculating Cost: {str(e)}")
                df['Cost'] = 0.0
        else:
            logger.info("Total Requests Sent not found, setting Cost to 0")
            df['Cost'] = 0.0

        # Add Net Profit column (if 'Profit' exists)
        if 'Profit (HB Rendered Ad)' in df.columns:
            try:
                df['Net Profit'] = df['Profit (HB Rendered Ad)'].astype(float) - df['Cost']
                logger.info("Added Net Profit column")
            except Exception as e:
                logger.error(f"Error calculating Net Profit: {str(e)}")
                df['Net Profit'] = -df['Cost']
        else:
            logger.info("Profit not found, setting Net Profit to -Cost")
            df['Net Profit'] = -df['Cost']

        # Round all numeric columns to 2 decimal places
        for col in df.select_dtypes(include=['float', 'int']).columns:
            df[col] = df[col].round(2)
        logger.info("Rounded numeric columns")

        # Drop helper columns not required for metric analysis
        helper_cols = [col for col in ['Helper1', 'Helper2', 'Temp', 'Debug'] if col in df.columns]
        if helper_cols:
            df = df.drop(columns=helper_cols)
            logger.info(f"Dropped helper columns: {helper_cols}")

        logger.info("Preprocessing completed successfully")
        return df

    except Exception as e:
        logger.error(f"Error in preprocessing: {str(e)}")
        raise 