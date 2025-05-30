#Overall Analysis Agent

import pandas as pd
import json
import os
import openai
from fastapi import HTTPException
from utils.llm_utils import safe_parse_llm_json
from models.analysis_schema import OverallAnalysisResponse
from services.utils import enhance_with_percentage_changes
import langchain
import langgraph


def run_overall_analysis_agent(df: pd.DataFrame, system: str) -> dict:
    # Enhance with % change columns if possible
    if 'Experiment Tokens' in df.columns:
        df = enhance_with_percentage_changes(df)
        # Ensure % columns are rounded and formatted
        for col in df.columns:
            if col.startswith('% Change in '):
                df[col] = df[col].apply(lambda x: f"{x}" if not x else (x if x.endswith('%') else f"{float(x.replace('%','')):.2f}%" if isinstance(x, str) and x.replace('%','').replace('.','',1).replace('+','',1).replace('-','',1).isdigit() else x))
    # Convert DataFrame to JSON records
    metrics_json = df.to_dict(orient='records')
    metrics_text = json.dumps(metrics_json, indent=2)

    # Build the prompt
    prompt = f'''
You are a strategic analyst reviewing an overall {system} experiment across cohorts.

System: {system}

Metrics:
{metrics_text}

Return only a valid JSON object with these fields:

{{{{
  "key_insights": ["string", ...],
  "final_verdict": "string (format: 'Final Verdict: <cohort name> is best overall')",
  "scalability_verdict": {{{{
    "verdict": "Scale" | "Hold" | "Avoid",
    "reasons": ["string (concise, number-driven)", ...]
  }}}},
  "metrics_table": [
    {{{{
      "name": "Metric name",
      "value": float (do not use null, always provide a number, use 0 if unknown),
      "baseline": float (do not use null, always provide a number, use 0 if unknown),
      "change": float (do not use null, always provide a number, use 0 if unknown),
      "significance": "positive" | "negative" | "neutral"
    }}}}
  ]
}}}}

Instructions for scalability_verdict:
- The 'scalability_verdict' field MUST be a JSON object with exactly two fields: 'verdict' (string: Scale, Hold, or Avoid) and 'reasons' (array of 1–2 concise, number-driven bullet points).
- Do NOT return a string, markdown, or prose. Only return a valid JSON object as specified.
- If you do not know, return: {{{{"verdict": "", "reasons": []}}}}
- The 'reasons' array should contain 1-2 bullets only.

Only output a single valid JSON object. No explanations, no markdown, no extra text. 
'''

    

    try:
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        response = openai.chat.completions.create(
            model="o3-mini", 
            messages=[{"role": "user", "content": prompt}],
            # temperature=0.2,
            # max_tokens=512,
        )
        content = response.choices[0].message.content
        print(content)
        parsed = safe_parse_llm_json(content)
        # Fallback for scalability_verdict if it's a string
        sv = parsed.get("scalability_verdict", {})
        if isinstance(sv, str):
            verdict = sv.split('-')[0].strip() if '-' in sv else sv.strip()
            reasons = [r.strip() for r in sv.split('•') if r.strip()]
            if len(reasons) == 0:
                reasons = [sv]
            parsed["scalability_verdict"] = {"verdict": verdict, "reasons": reasons}
        try:
            validated = OverallAnalysisResponse(**parsed)
            return validated
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM response structure invalid: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")