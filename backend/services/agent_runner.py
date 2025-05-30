# #Deep Dive Agent

# backend/services/agent_runner.py

import os
import json
import copy
from typing import List, Dict, Any
import pandas as pd
from fastapi import HTTPException
import openai
from config.config_manager import load_yaml, CONFIG_DIR
from services.konom_query import fetch_data
from services.data_parser import parse_response_json
from services.preprocess import preprocess_dataframe
from services.konom_query import fetch_deep_dive_data
from services.utils import enhance_with_percentage_changes
import langchain
import langgraph
from langgraph.graph import StateGraph

def format_metrics(metrics_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convert raw metrics data into the expected format."""
    formatted_metrics = []
    for key, value in metrics_data.items():
        if isinstance(value, (int, float)):
            formatted_metrics.append({
                "name": key,
                "value": value,
                "baseline": value,  # Using same value as baseline for now
                "change": 0.0,      # No change by default
                "significance": "neutral"  # Default significance
            })
    return formatted_metrics

def run_deep_dive_agent(
    original_request_json: dict,
    system: str,
    dimensions: List[str],
    threshold: int = 10
) -> dict:
    # 1. Deep copy request
    request_json = copy.deepcopy(original_request_json)

    # 2. Update 'rows' and 'dimensionObjectList' with selected dimensions
    rows = request_json.get("rows", [])
    dim_objects = request_json.get("dimensionObjectList", [])
    existing_row_dims = [r.get("dimension") for r in rows]
    existing_obj_dims = [o.get("dimension") for o in dim_objects]

    for dim in dimensions:
        new_entry = {"dimension": dim, "outputName": dim, "threshold": str(threshold)}

        if dim not in existing_row_dims:
            insert_idx = next((i for i, r in enumerate(rows) if r.get("dimension") == "Experiment Tokens"), len(rows))
            rows.insert(insert_idx, new_entry)

        if dim not in existing_obj_dims:
            dim_objects.append(new_entry)

    request_json["rows"] = rows
    request_json["dimensionObjectList"] = dim_objects

    # Remove 'group_by' if present before sending to fetch_deep_dive_data
    request_json.pop("group_by", None)

    # 3. Fetch API data
    try:
        response_json = fetch_deep_dive_data(request_json, dimensions, threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API fetch failed: {e}")

    df = parse_response_json(response_json)
    df = preprocess_dataframe(df)

    # 4. Load configs
    system_def = load_yaml(os.path.join(CONFIG_DIR, 'system_definition.yaml'))
    deep_dive_config = load_yaml(os.path.join(CONFIG_DIR, 'deep_dive_config.yaml'))
    metric_config = load_yaml(os.path.join(CONFIG_DIR, 'metric_config.yaml'))
    metric_defs = {m['name']: m.get('definition', '') for m in metric_config.get('metrics', [])}

    # 5. Segment-level analysis (all metrics and %changes in code)
    if not dimensions:
        raise HTTPException(status_code=400, detail="No dimensions provided for deep dive.")
    segment_keys = df[dimensions].drop_duplicates().to_dict(orient='records')
    segments = []

    for seg in segment_keys:
        mask = (df[list(seg)] == pd.Series(seg)).all(axis=1)
        seg_df = df[mask]
        # Use the same multi-bucket enhancement as main analysis
        seg_df_enhanced = enhance_with_percentage_changes(seg_df)
        metrics_table = seg_df_enhanced.round(2).to_dict(orient='records')
        segment_name = ', '.join([f"{k} = {v}" for k, v in seg.items()])
        # Only call LLM for summary/insight, not for metrics
        prompt = f"""
System: {system}
System Definition: {json.dumps(system_def, indent=2)}
Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
Segment: {segment_name}
Metric Table:
{json.dumps(metrics_table, indent=2)}
Metric Definitions: {json.dumps(metric_defs, indent=2)}

Instructions:
Summarize the key insights for this segment in 1-2 concise, number-driven bullet points. Return only a JSON array of strings, e.g. ["...", "..."]. Be specific with numbers and metrics."
        try:
            openai.api_key = os.environ.get("OPENAI_API_KEY")
            response = openai.chat.completions.create(
                model="o3-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            content = response.choices[0].message.content
            try:
                key_insights = json.loads(content)
                if not isinstance(key_insights, list):
                    key_insights = [str(key_insights)]
            except Exception:
                key_insights = [content]
        except Exception as e:
            key_insights = [f"LLM summary failed: {e}"]
        segments.append({
            "segment": segment_name,
            "metrics": metrics_table,
            "key_insights": key_insights,
            "final_verdict": "",
            "scalability_verdict": {"verdict": "", "reasons": []},
            "insight": ""
        })

    # 6. Overall summary (batch LLM call for all segments)
    overall_prompt = f"""
System: {system}
System Definition: {json.dumps(system_def, indent=2)}
Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
Segments: {json.dumps([{'segment': s['segment'], 'key_insights': s['key_insights']} for s in segments], indent=2)}

Instructions:
Summarize the key patterns and insights across all segments in 2-4 concise, analytical, and number-driven bullet points.
- Each bullet should be a single, crisp sentence.
- Focus on the most important findings and avoid repetition.
- Do NOT return a paragraph or prose, only a JSON array of strings, e.g. ["...", "..."]
- Be specific with numbers and metrics.
Return only the JSON array of bullet points, nothing else.
"""
    try:
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        response = openai.chat.completions.create(
            model="o3-mini",
            messages=[{"role": "user", "content": overall_prompt}],
        )
        content = response.choices[0].message.content.strip()
        try:
            overall_commentary = json.loads(content)
            if not isinstance(overall_commentary, list):
                overall_commentary = [str(overall_commentary)]
        except Exception:
            overall_commentary = [content]
    except Exception as e:
        overall_commentary = [f"LLM summary failed: {e}"]

    return {
        "segments": segments,
        "overall_commentary": overall_commentary
    }

def clean_segment_fields(parsed):
    # Ensure 'insight' exists (copy summary if missing)
    if 'insight' not in parsed:
        parsed['insight'] = parsed.get('summary', '')
    # Clean metrics
    cleaned_metrics = []
    for m in parsed.get('metrics', []):
        # Convert 'change' to float if it's a string with '%'
        change = m.get('change', 0.0)
        if isinstance(change, str):
            change = change.replace('%', '').strip()
            try:
                change = float(change)
            except Exception:
                change = 0.0
        cleaned_metrics.append({
            **m,
            'change': change
        })
    parsed['metrics'] = cleaned_metrics
    return parsed

# --- LangGraph Expanded Agentic Workflow ---
def fetch_data_node(state):
    from services.konom_query import fetch_deep_dive_data
    request_json = state['original_request_json']
    dimensions = state['dimensions']
    threshold = state.get('threshold', 10)
    response_json = fetch_deep_dive_data(request_json, dimensions, threshold)
    state['response_json'] = response_json
    return state

def parse_data_node(state):
    from services.data_parser import parse_response_json
    df = parse_response_json(state['response_json'])
    state['df'] = df
    return state

def preprocess_node(state):
    from services.preprocess import preprocess_dataframe
    df = preprocess_dataframe(state['df'])
    state['df'] = df
    return state

def segment_analysis_node(state):
    from services.utils import enhance_with_percentage_changes
    import openai, os, json, pandas as pd
    df = state['df']
    system = state['system']
    dimensions = state['dimensions']
    CONFIG_DIR = state.get('CONFIG_DIR', CONFIG_DIR)
    from config.config_manager import load_yaml
    system_def = load_yaml(os.path.join(CONFIG_DIR, 'system_definition.yaml'))
    deep_dive_config = load_yaml(os.path.join(CONFIG_DIR, 'deep_dive_config.yaml'))
    metric_config = load_yaml(os.path.join(CONFIG_DIR, 'metric_config.yaml'))
    metric_defs = {m['name']: m.get('definition', '') for m in metric_config.get('metrics', [])}
    segment_keys = df[dimensions].drop_duplicates().to_dict(orient='records')
    segments = []
    for seg in segment_keys:
        mask = (df[list(seg)] == pd.Series(seg)).all(axis=1)
        seg_df = df[mask]
        seg_df_enhanced = enhance_with_percentage_changes(seg_df)
        metrics_table = seg_df_enhanced.round(2).to_dict(orient='records')
        segment_name = ', '.join([f"{k} = {v}" for k, v in seg.items()])
        prompt = f"""
System: {system}
System Definition: {json.dumps(system_def, indent=2)}
Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
Segment: {segment_name}
Metric Table:
{json.dumps(metrics_table, indent=2)}
Metric Definitions: {json.dumps(metric_defs, indent=2)}

Instructions:
Summarize the key insights for this segment in 1-2 concise, number-driven bullet points. Return only a JSON array of strings, e.g. ["...", "..."]. Be specific with numbers and metrics."
        try:
            openai.api_key = os.environ.get("OPENAI_API_KEY")
            response = openai.chat.completions.create(
                model="o3-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            content = response.choices[0].message.content
            try:
                key_insights = json.loads(content)
                if not isinstance(key_insights, list):
                    key_insights = [str(key_insights)]
            except Exception:
                key_insights = [content]
        except Exception as e:
            key_insights = [f"LLM summary failed: {e}"]
        segments.append({
            "segment": segment_name,
            "metrics": metrics_table,
            "key_insights": key_insights,
            "final_verdict": "",
            "scalability_verdict": {"verdict": "", "reasons": []},
            "insight": ""
        })
    state['segments'] = segments
    return state

def overall_summary_node(state):
    import openai, os, json
    system = state['system']
    CONFIG_DIR = state.get('CONFIG_DIR', CONFIG_DIR)
    from config.config_manager import load_yaml
    system_def = load_yaml(os.path.join(CONFIG_DIR, 'system_definition.yaml'))
    deep_dive_config = load_yaml(os.path.join(CONFIG_DIR, 'deep_dive_config.yaml'))
    segments = state['segments']
    overall_prompt = f"""
System: {system}
System Definition: {json.dumps(system_def, indent=2)}
Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
Segments: {json.dumps([{'segment': s['segment'], 'key_insights': s['key_insights']} for s in segments], indent=2)}

Instructions:
Summarize the key patterns and insights across all segments in 2-4 concise, analytical, and number-driven bullet points.\n- Each bullet should be a single, crisp sentence.\n- Focus on the most important findings and avoid repetition.\n- Do NOT return a paragraph or prose, only a JSON array of strings, e.g. ["...", "..."]\n- Be specific with numbers and metrics.\nReturn only the JSON array of bullet points, nothing else.
"""
    try:
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        response = openai.chat.completions.create(
            model="o3-mini",
            messages=[{"role": "user", "content": overall_prompt}],
        )
        content = response.choices[0].message.content.strip()
        try:
            overall_commentary = json.loads(content)
            if not isinstance(overall_commentary, list):
                overall_commentary = [str(overall_commentary)]
        except Exception:
            overall_commentary = [content]
    except Exception as e:
        overall_commentary = [f"LLM summary failed: {e}"]
    state['overall_commentary'] = overall_commentary
    return state

# Define the expanded graph
expanded_graph = StateGraph()
expanded_graph.add_node('fetch_data', fetch_data_node)
expanded_graph.add_node('parse_data', parse_data_node)
expanded_graph.add_node('preprocess', preprocess_node)
expanded_graph.add_node('segment_analysis', segment_analysis_node)
expanded_graph.add_node('overall_summary', overall_summary_node)
expanded_graph.set_entry_point('fetch_data')
expanded_graph.add_edge('fetch_data', 'parse_data')
expanded_graph.add_edge('parse_data', 'preprocess')
expanded_graph.add_edge('preprocess', 'segment_analysis')
expanded_graph.add_edge('segment_analysis', 'overall_summary')
# The final output will be in state['segments'] and state['overall_commentary']

# import os
# import json
# from typing import List, Dict, Any
# import pandas as pd
# from fastapi import HTTPException
# import openai
# from config.config_manager import load_yaml
# from services.konom_query import fetch_data
# from services.data_parser import parse_response_json
# from services.preprocess import preprocess_dataframe
# from models.analysis_schema import DeepDiveResponse, DeepDiveSegment, MetricRow

# def run_overall_analysis_agent(df: pd.DataFrame, system: str) -> dict:
#     """
#     Runs the agentic AI system to generate overall experiment verdict.
#     """
#     # 1. Load configs
#     system_def = load_yaml(os.path.join('configs', 'system_definition.yaml'))
#     metric_config = load_yaml(os.path.join('configs', 'metric_config.yaml'))

#     # 2. Prepare metric table and definitions
#     df_rounded = df.round(2)
#     metrics_table = df_rounded.to_dict(orient='records')
#     important_metrics = system_def.get('important_metrics', [])
#     metric_defs = {m['name']: m.get('definition', '') for m in metric_config.get('metrics', [])}

#     # 3. Build prompt
#     prompt = f"""
# System: {system}
# System Definition: {json.dumps(system_def, indent=2)}

# Metric Table:
# {json.dumps(metrics_table, indent=2)}

# Important Metrics: {important_metrics}
# Metric Definitions: {json.dumps(metric_defs, indent=2)}

# Instructions:
# Analyze the metric table in the context of the system definition. Return a JSON with:
# {{
#   "summary": "...",
#   "key_insights": ["...", "..."],
#   "risk_flags": ["...", "..."]
# }}
# """
#     try:
#         openai.api_key = os.environ.get("OPENAI_API_KEY")
#         response = openai.chat.completions.create(
#             model="o3-mini", # o3-mini placeholder
#             messages=[{"role": "user", "content": prompt}],
#         )
#         content = response.choices[0].message.content
#         result = json.loads(content)
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

# # backend/services/agent_runner.py

# def run_deep_dive_agent(
#     original_request_json: dict,
#     system: str,
#     dimensions: List[str]
# ) -> dict:
#     # 1. Modify request JSON
#     request_json = dict(original_request_json)
#     request_json['group_by'] = dimensions

#     # 2. Fetch grouped data
#     response_json = fetch_data(request_json)
#     df = parse_response_json(response_json)
#     df = preprocess_dataframe(df)

#     # 🚨 DEBUG: Print schema
#     print("🔍 Final Request JSON:", json.dumps(request_json, indent=2))
#     print("📊 Columns in parsed DataFrame:", list(df.columns))

#     # 3. Segment data
#     missing_dims = [dim for dim in dimensions if dim not in df.columns]
#     if missing_dims:
#         raise HTTPException(status_code=400, detail=f"Missing columns in data: {missing_dims}")

#     segment_keys = df[dimensions].drop_duplicates().to_dict(orient='records')
#     segments = []

#     # 4. Load config
#     system_def = load_yaml(os.path.join('configs', 'system_definition.yaml'))
#     deep_dive_config = load_yaml(os.path.join('configs', 'deep_dive_config.yaml'))
#     metric_config = load_yaml(os.path.join('configs', 'metric_config.yaml'))
#     metric_defs = {m['name']: m.get('definition', '') for m in metric_config.get('metrics', [])}

#     # 5. Analyze each segment
#     for seg in segment_keys:
#         mask = pd.Series(True, index=df.index)
#         for k, v in seg.items():
#             mask &= df[k] == v
#         seg_df = df[mask]

#         metrics_table = seg_df.round(2).to_dict(orient='records')
#         segment_name = ', '.join([f"{k} = {v}" for k, v in seg.items()])
#         prompt = f"""
# System: {system}
# System Definition: {json.dumps(system_def, indent=2)}
# Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
# Segment: {segment_name}
# Metric Table: {json.dumps(metrics_table, indent=2)}
# Metric Definitions: {json.dumps(metric_defs, indent=2)}

# Instructions:
# Analyze this segment and return a JSON with:
# {{
#   "insight": "...",
#   "metrics": [...]
# }}
# """
#         try:
#             openai.api_key = os.getenv("OPENAI_API_KEY")
#             response = openai.chat.completions.create(
#                 model="o3-mini",
#                 messages=[{"role": "user", "content": prompt}],
#             )
#             content = response.choices[0].message.content
#             parsed = json.loads(content)
#             segments.append({
#                 "segment": segment_name,
#                 "insight": parsed.get("insight", ""),
#                 "metrics": parsed.get("metrics", []),
#             })
#         except Exception as e:
#             segments.append({
#                 "segment": segment_name,
#                 "insight": f"LLM analysis failed: {e}",
#                 "metrics": [],
#             })

#     # 6. Overall Summary
#     overall_prompt = f"""
# System: {system}
# System Definition: {json.dumps(system_def, indent=2)}
# Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
# Segments: {json.dumps(segments, indent=2)}

# Instructions:
# Summarize the key patterns and insights across all segments. Return a string.
# """
#     try:
#         response = openai.chat.completions.create(
#             model="o3-mini",
#             messages=[{"role": "user", "content": overall_prompt}],
#         )
#         overall_commentary = response.choices[0].message.content.strip()
#     except Exception as e:
#         overall_commentary = f"LLM summary failed: {e}"

#     return {
#         "segments": segments,
#         "overall_commentary": overall_commentary,
#     }


# def run_deep_dive_agent(
#     original_request_json: dict,
#     system: str,
#     dimensions: List[str]
# ) -> dict:
#     """
#     Performs deep-dive segment analysis.
#     """
#     # 1. Modify request JSON to include group_by
#     request_json = dict(original_request_json)
#     request_json['group_by'] = dimensions

#     # 2. Fetch grouped data
#     response_json = fetch_data(request_json)
#     df = parse_response_json(response_json)
#     df = preprocess_dataframe(df)

#     # 3. Segment data into cohorts
#     if not dimensions:
#         raise HTTPException(status_code=400, detail="No dimensions provided for deep dive.")
#     segment_keys = df[dimensions].drop_duplicates().to_dict(orient='records')
#     segments = []

#     # 4. Load configs
#     system_def = load_yaml(os.path.join('configs', 'system_definition.yaml'))
#     deep_dive_config = load_yaml(os.path.join('configs', 'deep_dive_config.yaml'))
#     metric_config = load_yaml(os.path.join('configs', 'metric_config.yaml'))
#     metric_defs = {m['name']: m.get('definition', '') for m in metric_config.get('metrics', [])}

#     # 5. For each segment, compute metrics and call LLM
#     for seg in segment_keys:
#         # mask = (df[list(seg)] == pd.Series(seg)).all(axis=1)
#         mask = pd.Series([all(row[k] == v for k, v in seg.items()) for _, row in df.iterrows()])
#         seg_df = df[mask]
#         metrics_table = seg_df.round(2).to_dict(orient='records')
#         segment_name = ', '.join([f"{k} = {v}" for k, v in seg.items()])
#         prompt = f"""
# System: {system}
# System Definition: {json.dumps(system_def, indent=2)}
# Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
# Segment: {segment_name}
# Metric Table:
# {json.dumps(metrics_table, indent=2)}
# Metric Definitions: {json.dumps(metric_defs, indent=2)}

# Instructions:
# Analyze this segment and return a JSON with:
# {{
#   "insight": "...",
#   "metrics": [...]
# }}
# """
#         try:
#             openai.api_key = os.environ.get("OPENAI_API_KEY")
#             response = openai.chat.completions.create(
#                 model="o3-mini",
#                 messages=[{"role": "user", "content": prompt}],
#             )
#             content = response.choices[0].message.content
#             parsed = json.loads(content)
#             segments.append({
#                 "segment": segment_name,
#                 "insight": parsed.get("insight", ""),
#                 "metrics": parsed.get("metrics", []),
#             })
#         except Exception as e:
#             segments.append({
#                 "segment": segment_name,
#                 "insight": f"LLM analysis failed: {e}",
#                 "metrics": [],
#             })

#     # 6. Overall commentary
#     overall_prompt = f"""
# System: {system}
# System Definition: {json.dumps(system_def, indent=2)}
# Deep Dive Config: {json.dumps(deep_dive_config, indent=2)}
# Segments: {json.dumps(segments, indent=2)}

# Instructions:
# Summarize the key patterns and insights across all segments. Return a string.
# """
#     try:
#         openai.api_key = os.environ.get("OPENAI_API_KEY")
#         response = openai.chat.completions.create(
#             model="o3-mini",
#             messages=[{"role": "user", "content": overall_prompt}],
#         )
#         overall_commentary = response.choices[0].message.content.strip()
#     except Exception as e:
#         overall_commentary = f"LLM summary failed: {e}"

#     return {
#         "segments": segments,
#         "overall_commentary": overall_commentary,
#     } 