from fastapi import APIRouter, HTTPException
from models.analysis_schema import DeepDiveQuery, DeepDiveResponse
from services.konom_query import fetch_data
from services.data_parser import parse_response_json
from services.preprocess import preprocess_dataframe
from services.agent_runner import run_deep_dive_agent

router = APIRouter()

@router.post("/deep-dive-query", response_model=DeepDiveResponse)
async def deep_dive_query(payload: DeepDiveQuery):
    try:
        # Modify request_json to include group_by
        request_json = dict(payload.request_json)
        request_json['group_by'] = payload.dimensions

        # Fetch grouped data
        response_json = fetch_data(request_json)
        df = parse_response_json(response_json)
        df = preprocess_dataframe(df)

        # Run deep dive agent
        result = run_deep_dive_agent(request_json, payload.system, payload.dimensions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deep dive analysis failed: {e}") 

        