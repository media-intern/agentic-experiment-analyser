from fastapi import APIRouter, UploadFile, HTTPException, Form, Query
import os
from utils.file_saver import save_uploaded_file_sync
from config.config_manager import CONFIG_DIR

router = APIRouter()

REQUIRED_FILES = [
    "metric_config.yaml",
    "system_definition.yaml",
    "deep_dive_config.yaml",
]

@router.get("/config-status")
async def get_config_status(user_id: str = Query(...)):
    """Check if all required config files are present for a user."""
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    user_config_dir = f"configs/{user_id}"
    all_exist = True
    for fname in REQUIRED_FILES:
        if bucket_name:
            from google.cloud import storage
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(f"{user_config_dir}/{fname}")
            print(f"[DEBUG] Checking GCS for: {user_config_dir}/{fname}")
            if not blob.exists():
                print(f"[DEBUG] MISSING in GCS: {user_config_dir}/{fname}")
                all_exist = False
                break
        else:
            full_path = os.path.join(user_config_dir, fname)
            print(f"[DEBUG] Checking local for: {full_path}")
            if not os.path.exists(full_path):
                print(f"[DEBUG] MISSING locally: {full_path}")
                all_exist = False
                break
    print(f"[DEBUG] config_complete: {all_exist}")
    return {"config_complete": all_exist}

@router.post("/upload-config")
async def upload_config(file: UploadFile, user_id: str = Form(...)):
    try:
        print(f"[UPLOAD CONFIG] Received file: {file.filename} for user {user_id}")
        if file.filename not in REQUIRED_FILES:
            raise HTTPException(status_code=400, detail=f"Unexpected config file: {file.filename}")
        bucket_name = os.getenv("GCS_BUCKET_NAME")
        user_config_dir = f"configs/{user_id}"
        saved_path = save_uploaded_file_sync(file, user_config_dir, bucket_name)
        print(f"[UPLOAD CONFIG] File saved to: {saved_path}")
        return {"message": f"File {file.filename} uploaded successfully for user {user_id}."}
    except Exception as e:
        print(f"[UPLOAD CONFIG] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@router.get("/check-config")
def check_config_files():
    missing_files = []
    for filename in REQUIRED_FILES:
        file_path = os.path.join(CONFIG_DIR, filename)
        if not os.path.exists(file_path):
            missing_files.append(filename)

    if missing_files:
        print(f"[CHECK CONFIG] Missing files: {missing_files}")
        return {"status": "incomplete", "missing": missing_files}
    
    print("[CHECK CONFIG] All required files present.")
    return {"status": "complete"}


# from fastapi import APIRouter, UploadFile, File, HTTPException, status
# import os
# from utils.file_saver import save_uploaded_file

# router = APIRouter()

# # CONFIG_DIR = os.path.expanduser("~/.agentic_ai_config")
# CONFIG_DIR = os.path.expanduser("~/.agentic_ai_config")
# os.makedirs(CONFIG_DIR, exist_ok=True)
# file_path = os.path.join(CONFIG_DIR, file.filename)


# REQUIRED_FILES = [
#     "metric_config.yaml",
#     "system_config.yaml",
#     "system_definition.yaml",
#     "deep_dive_config.yaml",
# ]

# @router.post("/upload-config")
# async def upload_config(
#     metric_config: UploadFile = File(...),
#     system_config: UploadFile = File(...),
#     system_definition: UploadFile = File(...),
#     deep_dive_config: UploadFile = File(...),
# ):
#     os.makedirs(CONFIG_DIR, exist_ok=True)
#     files = [
#         (metric_config, "metric_config.yaml"),
#         (system_config, "system_config.yaml"),
#         (system_definition, "system_definition.yaml"),
#         (deep_dive_config, "deep_dive_config.yaml"),
#     ]
#     for upload, expected_name in files:
#         if not upload.filename.endswith(".yaml"):
#             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{upload.filename} is not a .yaml file")
#         path = os.path.join(CONFIG_DIR, expected_name)
#         await save_uploaded_file(upload, path)
#         print(f"[CONFIG UPLOAD] Saved {expected_name} to {path}")

#     return {"success": True}

# # from fastapi import APIRouter, UploadFile, File, HTTPException, status
# # import os
# # from utils.file_saver import save_uploaded_file

# # router = APIRouter()

# # REQUIRED_FILES = [
# #     "metric_config.yaml",
# #     "system_config.yaml",
# #     "system_definition.yaml",
# #     "deep_dive_config.yaml",
# # ]

# # @router.post("/upload-config")
# # async def upload_config(
# #     metric_config: UploadFile = File(...),
# #     system_config: UploadFile = File(...),
# #     system_definition: UploadFile = File(...),
# #     deep_dive_config: UploadFile = File(...),
# # ):
# #     files = [
# #         (metric_config, "metric_config.yaml"),
# #         (system_config, "system_config.yaml"),
# #         (system_definition, "system_definition.yaml"),
# #         (deep_dive_config, "deep_dive_config.yaml"),
# #     ]
# #     os.makedirs("configs", exist_ok=True)
# #     for upload, expected_name in files:
# #         if not upload.filename.endswith(".yaml"):
# #             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{upload.filename} is not a .yaml file")
# #         # Save file as the expected name in configs/
# #         await save_uploaded_file(upload, os.path.join("configs", expected_name))
# #     return {"success": True} 