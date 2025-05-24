from dotenv import load_dotenv
import os

def load_env_vars():
    load_dotenv()
    return {
        "QUERY_API_BASE": os.getenv("QUERY_API_BASE"),
        "QUERY_API_USER": os.getenv("QUERY_API_USER"),
        "QUERY_API_TOKEN": os.getenv("QUERY_API_TOKEN"),
        "QUERY_API_GROUP": os.getenv("QUERY_API_GROUP"),
        "QUERY_CONTENT_TYPE": os.getenv("QUERY_CONTENT_TYPE"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    } 