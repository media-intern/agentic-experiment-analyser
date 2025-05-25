import aiofiles
import os
from fastapi import UploadFile

# Used for async file handling
async def save_uploaded_file(upload_file: UploadFile, destination: str):
    with open(destination, "wb") as buffer:
        contents = await upload_file.read()
        buffer.write(contents)

# Used in backend config routes
def save_uploaded_file_sync(upload_file: UploadFile, save_dir: str) -> str:
    """
    Saves an uploaded file to the given directory. Creates the directory if it doesn't exist.
    Returns the full save path.
    """
    print(f"[FILE SAVER] Saving to: {save_dir}")
    os.makedirs(save_dir, exist_ok=True)
    print(f"[FILE SAVER] Successfully ensured directory exists.")
    save_path = os.path.join(save_dir, upload_file.filename)
    print(f"[FILE SAVER] Saving to: {save_path}")
    with open(save_path, 'wb') as out_file:
        out_file.write(upload_file.file.read())
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