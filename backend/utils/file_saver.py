import aiofiles
import os
from fastapi import UploadFile
import typing as t

# Google Cloud Storage
from google.cloud import storage
import google.auth.exceptions

# Used for async file handling
async def save_uploaded_file(upload_file: UploadFile, destination: str, bucket_name: t.Optional[str] = None):
    if bucket_name:
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(upload_file.filename)
            await upload_file.seek(0)
            blob.upload_from_file(upload_file.file, rewind=True)
            print(f"[GCS] Uploaded {upload_file.filename} to bucket {bucket_name}")
            return f"gs://{bucket_name}/{upload_file.filename}"
        except google.auth.exceptions.DefaultCredentialsError as e:
            print(f"[GCS ERROR] {e}. Falling back to local storage.")
        except Exception as e:
            print(f"[GCS ERROR] {e}. Falling back to local storage.")
    # Fallback to local storage
    os.makedirs(destination, exist_ok=True)
    save_path = os.path.join(destination, upload_file.filename)
    async with aiofiles.open(save_path, "wb") as out_file:
        await upload_file.seek(0)
        contents = await upload_file.read()
        await out_file.write(contents)
    print(f"[LOCAL] Saved {upload_file.filename} to {save_path}")
    return save_path

# Used in backend config routes
# Synchronous version for compatibility
def save_uploaded_file_sync(upload_file: UploadFile, save_dir: str, bucket_name: t.Optional[str] = None) -> str:
    if bucket_name:
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(upload_file.filename)
            upload_file.file.seek(0)
            blob.upload_from_file(upload_file.file, rewind=True)
            print(f"[GCS] Uploaded {upload_file.filename} to bucket {bucket_name}")
            return f"gs://{bucket_name}/{upload_file.filename}"
        except google.auth.exceptions.DefaultCredentialsError as e:
            print(f"[GCS ERROR] {e}. Falling back to local storage.")
        except Exception as e:
            print(f"[GCS ERROR] {e}. Falling back to local storage.")
    # Fallback to local storage
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, upload_file.filename)
    with open(save_path, 'wb') as out_file:
        upload_file.file.seek(0)
        out_file.write(upload_file.file.read())
    print(f"[LOCAL] Saved {upload_file.filename} to {save_path}")
    return save_path

# import aiofiles
# import os
# from fastapi import UploadFile

# # async def save_uploaded_file(upload_file: UploadFile, destination: str):
# #     async with aiofiles.open(destination, 'wb') as out_file:
# #         while content := await upload_file.read(1024):
# #             await out_file.write(content)
# #     await upload_file.close()

# async def save_uploaded_file(upload_file: UploadFile, destination: str):
#     with open(destination, "wb") as buffer:
#         contents = await upload_file.read()
#         buffer.write(contents)


# # Synchronous version for direct use

# def save_uploaded_file_sync(upload_file: UploadFile, save_dir: str) -> str:
#     """
#     Saves an uploaded file to the given directory.
#     Returns the path where the file was saved.
#     """
#     os.makedirs(save_dir, exist_ok=True)
#     save_path = os.path.join(save_dir, upload_file.filename)
#     with open(save_path, 'wb') as out_file:
#         out_file.write(upload_file.file.read())
#     return save_path 