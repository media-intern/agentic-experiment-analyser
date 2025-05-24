import os
import requests
import json
import copy
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

QUERY_API_BASE = os.getenv("QUERY_API_BASE", "http://nv-konom.internal.reports.mn/api/v2/query/")

def fetch_data(request_json: dict) -> dict:
    headers = {
        "X-KONOM-USER": os.getenv("QUERY_API_USER"),
        "X-AUTH-TOKEN": os.getenv("QUERY_API_TOKEN"),
        "X-KONOM-GROUP": os.getenv("QUERY_API_GROUP"),
        "Content-Type": os.getenv("QUERY_CONTENT_TYPE"),
    }
    try:
        resp = requests.post(QUERY_API_BASE, json=request_json, headers=headers)
        logger.info(f"Konom API status code: {resp.status_code}")
        logger.info(f"Konom API response: {resp.text[:500]}")
        if resp.status_code == 200:
            return resp.json()
        else:
            raise HTTPException(status_code=resp.status_code, detail=f"Konom API error: {resp.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Konom API request failed: {e}")


def fetch_deep_dive_data(original_request_json: dict, dimensions: list, threshold: int = 10) -> dict:
    request_json = copy.deepcopy(original_request_json)
    rows = request_json.get("rows", [])
    dim_objects = request_json.get("dimensionObjectList", [])

    existing_row_dims = [r.get("dimension") for r in rows]
    existing_obj_dims = [o.get("dimension") for o in dim_objects]

    for dim in dimensions:
        new_row = {
            "dimension": dim,
            "outputName": dim,
            "threshold": str(threshold)
        }
        if dim not in existing_row_dims:
            insert_idx = next((i for i, r in enumerate(rows) if r.get("dimension") == "Experiment Tokens"), len(rows))
            rows.insert(insert_idx, new_row)
        if dim not in existing_obj_dims:
            dim_objects.append(new_row)

    request_json["rows"] = rows
    request_json["dimensionObjectList"] = dim_objects

    # Optionally log the request JSON for debugging
    with open("deep_dive_request_debug.json", "w") as f:
        json.dump(request_json, f, indent=2)

    response = fetch_data(request_json)
    return response
