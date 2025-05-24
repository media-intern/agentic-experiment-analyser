import aiofiles
import os
from fastapi import UploadFile

async def save_uploaded_file(upload_file: UploadFile, destination: str):
    async with aiofiles.open(destination, 'wb') as out_file:
        while content := await upload_file.read(1024):
            await out_file.write(content)
    await upload_file.close()

# Synchronous version for direct use

def save_uploaded_file_sync(upload_file: UploadFile, save_dir: str) -> str:
    """
    Saves an uploaded file to the given directory.
    Returns the path where the file was saved.
    """
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, upload_file.filename)
    with open(save_path, 'wb') as out_file:
        out_file.write(upload_file.file.read())
    return save_path 