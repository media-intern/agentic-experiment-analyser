import langchain
import langgraph
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse
import json
from services.konom_query import fetch_data
from services.data_parser import parse_response_json
from services.preprocess import preprocess_dataframe
from services.llm_analyzer import run_overall_analysis_agent
from models.analysis_schema import OverallAnalysisResponse
from typing import Optional
from config.config_manager import load_system_definition

router = APIRouter()

@router.post("/analyze-request", response_model=OverallAnalysisResponse)
async def analyze_request(
    request_file: UploadFile = File(...),
    system: Optional[str] = Form(None),
):
    try:
        print(" Reading uploaded file...")
        content = await request_file.read()

        try:
            request_json = json.loads(content)
            print(" Successfully parsed JSON.")
        except Exception:
            print(" Failed to parse uploaded JSON.")
            raise HTTPException(status_code=400, detail="Invalid JSON file uploaded.")

        # Fetch system from YAML if not provided
        if system is None:
            print(" System not provided via form. Attempting to infer from YAML...")
            system_def = load_system_definition.__wrapped__(None)  # loads as dict
            if len(system_def) == 1:
                system = list(system_def.keys())[0]
                print(f" Inferred system: {system}")
            else:
                raise HTTPException(status_code=400, detail="System not provided and could not be inferred.")
        else:
            print(f" Using provided system: {system}")

        # Fetch Konom data
        try:
            print(" Fetching data from Konom API...")
            konom_response = fetch_data(request_json)
            print(" Konom data received.")
        except Exception as e:
            print(f" Konom fetch failed: {e}")
            raise HTTPException(status_code=500, detail=f"Konom fetch failed: {e}")

        # Parse JSON into DataFrame
        try:
            print(" Parsing response JSON into DataFrame...")
            parsed_df = parse_response_json(konom_response)
            print(f" Parsed DataFrame with columns: {list(parsed_df.columns)}")
        except Exception as e:
            print(f" Parsing response failed: {e}")
            raise HTTPException(status_code=500, detail=f"Parsing response failed: {e}")

        # Preprocess DataFrame
        try:
            print(" Preprocessing DataFrame...")
            processed_df = preprocess_dataframe(parsed_df)
            print(f" DataFrame shape after preprocessing: {processed_df.shape}")
        except Exception as e:
            print(f" Preprocessing failed: {e}")
            raise HTTPException(status_code=500, detail=f"Preprocessing failed: {e}")

        # LLM-based analysis
        try:
            print(" Sending data to LLM for overall analysis...")
            verdict = run_overall_analysis_agent(processed_df, system)
            print(" LLM analysis completed.")
        except Exception as e:
            print(f" LLM analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

        return verdict

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f" Uncaught error: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})


# from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
# from fastapi.responses import JSONResponse
# import json
# from services.konom_query import fetch_data
# from services.data_parser import parse_response_json
# from services.preprocess import preprocess_dataframe
# from services.llm_analyzer import run_overall_analysis_agent
# from models.analysis_schema import OverallAnalysisResponse
# from typing import Optional
# from config.config_manager import load_system_definition

# router = APIRouter()

# @router.post("/analyze-request", response_model=OverallAnalysisResponse)
# async def analyze_request(
#     request_file: UploadFile = File(...),
#     system: Optional[str] = Form(None),
# ):
#     try:
#         # Read and parse the uploaded JSON file
#         content = await request_file.read()
#         try:
#             request_json = json.loads(content)
#         except Exception:
#             raise HTTPException(status_code=400, detail="Invalid JSON file uploaded.")

#         # If system is not provided, fetch from system_definition.yaml
#         if system is None:
#             system_def = load_system_definition.__wrapped__(None)  # loads the dict
#             if len(system_def) == 1:
#                 system = list(system_def.keys())[0]
#             else:
#                 raise HTTPException(status_code=400, detail="System not provided and could not be inferred.")

#         # Fetch data from Konom
#         try:
#             konom_response = fetch_data(request_json)
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"Konom fetch failed: {e}")

#         # Parse Konom response
#         try:
#             parsed_df = parse_response_json(konom_response)
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"Parsing response failed: {e}")

#         # Preprocess DataFrame
#         try:
#             processed_df = preprocess_dataframe(parsed_df)
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"Preprocessing failed: {e}")

#         # Run LLM-based analysis
#         try:
#             verdict = run_overall_analysis_agent(processed_df, system)
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

#         # Return structured response
#         return verdict
#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"detail": str(e)}) 