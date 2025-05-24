import pandas as pd
from typing import List
import re

def enhance_with_percentage_changes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds % change columns for selected metrics, comparing each bucket to the control group.
    Control group is identified by parsing all rows in 'Experiment Tokens' for defined control keywords.
    The best match is chosen by scoring: prefer exact or end-of-string matches for '0', 'control', etc.
    Also prettifies key metric values and adds a single '%Change' column for the primary metric.
    """
    if 'Experiment Tokens' not in df.columns:
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
    primary_metric = metrics[0]  # Use the first metric as the primary for %Change column

    def control_score(token: str) -> int:
        token = token.lower()
        score = 0
        # Prefer exact match for '0' or 'control' etc.
        for kw in control_keywords:
            if token == kw:
                score += 100
            # End-of-string match for '0' (e.g., 'lessCtrl:0')
            if kw == '0' and re.search(r'[:_\-]0$', token):
                score += 50
            # Contains keyword as a whole word or after separator
            if re.search(rf'(^|[:_\-]){re.escape(kw)}($|[:_\-])', token):
                score += 20
            # Substring match (lowest priority)
            if kw in token:
                score += 5
        return score

    # Score all rows
    scores = df['Experiment Tokens'].astype(str).apply(control_score)
    if scores.max() == 0:
        return df  # No control found
    control_idx = scores.idxmax()
    control_row = df.loc[control_idx]

    # Prettify and calculate % change for each metric
    for metric in metrics:
        if metric not in df.columns:
            continue
        control_value = control_row[metric]
        # Try to convert control_value to float
        try:
            control_value = float(control_value)
        except (ValueError, TypeError):
            continue
        new_col = f"% Change in {metric}"
        pct_changes = []
        prettified = []
        for val in df[metric]:
            # % change calculation
            try:
                val_f = float(val)
                if pd.isnull(val_f) or pd.isnull(control_value) or control_value == 0:
                    pct = ""
                else:
                    pct_val = 100 * (val_f - control_value) / abs(control_value)
                    sign = "+" if pct_val >= 0 else ""
                    pct = f"{sign}{pct_val:.2f}%"
            except (ValueError, TypeError):
                pct = ""
            pct_changes.append(pct)
            # Prettify value
            if metric in prettify_dollar:
                try:
                    prettified.append(f"${int(float(val)):,}")
                except Exception:
                    prettified.append(val)
            elif metric in prettify_2dec:
                try:
                    prettified.append(f"{float(val):.2f}")
                except Exception:
                    prettified.append(val)
            else:
                prettified.append(val)
        df[metric] = prettified
        df[new_col] = pct_changes

    # Add a single '%Change' column for the primary metric
    primary_pct_col = f"% Change in {primary_metric}"
    if primary_pct_col in df.columns:
        df['%Change'] = df[primary_pct_col]

    return df 