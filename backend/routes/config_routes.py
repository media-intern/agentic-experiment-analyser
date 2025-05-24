from fastapi import APIRouter, UploadFile, File, HTTPException, status
import os
from utils.file_saver import save_uploaded_file

router = APIRouter()

REQUIRED_FILES = [
    "metric_config.yaml",
    "system_config.yaml",
    "system_definition.yaml",
    "deep_dive_config.yaml",
]

@router.post("/upload-config")
async def upload_config(
    metric_config: UploadFile = File(...),
    system_config: UploadFile = File(...),
    system_definition: UploadFile = File(...),
    deep_dive_config: UploadFile = File(...),
):
    files = [
        (metric_config, "metric_config.yaml"),
        (system_config, "system_config.yaml"),
        (system_definition, "system_definition.yaml"),
        (deep_dive_config, "deep_dive_config.yaml"),
    ]
    os.makedirs("configs", exist_ok=True)
    for upload, expected_name in files:
        if not upload.filename.endswith(".yaml"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{upload.filename} is not a .yaml file")
        # Save file as the expected name in configs/
        await save_uploaded_file(upload, os.path.join("configs", expected_name))
    return {"success": True} 