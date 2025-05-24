import json
import re

def safe_parse_llm_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            cleaned = (
                text.replace("'", '"')
                    .replace('\n', '')
                    .replace('\t', '')
            )
            cleaned = re.sub(r",\s*}", "}", cleaned)
            cleaned = re.sub(r",\s*]", "]", cleaned)
            return json.loads(cleaned)
        except Exception as e:
            raise ValueError(f"Failed to clean LLM output: {e}")
