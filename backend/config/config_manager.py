import yaml
import os
from functools import lru_cache

CONFIG_DIR = os.path.expanduser("~/.agentic_ai_config")
print(f"[CONFIG MANAGER] CONFIG_DIR resolved to: {CONFIG_DIR}")


def load_yaml(file_path: str) -> dict:
    try:
        print(f"[LOAD YAML] Loading file: {file_path}")
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError(f"YAML file {file_path} does not contain a valid dictionary.")
            return data
    except FileNotFoundError:
        raise FileNotFoundError(f"File not found: {file_path}")
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in {file_path}: {e}")

@lru_cache(maxsize=8)
def load_metric_config() -> dict:
    path = os.path.join(CONFIG_DIR, 'metric_config.yaml')
    return load_yaml(path)

@lru_cache(maxsize=8)
def load_system_definition(system: str) -> dict:
    path = os.path.join(CONFIG_DIR, 'system_definition.yaml')
    return load_yaml(path)

@lru_cache(maxsize=8)
def load_deep_dive_config() -> dict:
    path = os.path.join(CONFIG_DIR, 'deep_dive_config.yaml')
    return load_yaml(path)

# @lru_cache(maxsize=8)
# def load_system_config() -> dict:
#     path = os.path.join(CONFIG_DIR, 'system_config.yaml')
#     return load_yaml(path)


# import yaml
# import os
# from functools import lru_cache

# CONFIG_DIR = os.path.expanduser("~/.agentic_ai_config")

# def load_yaml(file_path: str) -> dict:
#     try:
#         print(f"[LOAD YAML] Loading file: {file_path}")
#         with open(file_path, 'r') as f:
#             data = yaml.safe_load(f)
#             if not isinstance(data, dict):
#                 raise ValueError(f"YAML file {file_path} does not contain a valid dictionary.")
#             return data
#     except FileNotFoundError:
#         raise FileNotFoundError(f"File not found: {file_path}")
#     except yaml.YAMLError as e:
#         raise ValueError(f"Invalid YAML in {file_path}: {e}")

# @lru_cache(maxsize=8)
# def load_metric_config() -> dict:
#     return load_yaml(os.path.join(CONFIG_DIR, 'metric_config.yaml'))

# @lru_cache(maxsize=8)
# def load_system_definition(system: str) -> dict:
#     return load_yaml(os.path.join(CONFIG_DIR, 'system_definition.yaml'))

# @lru_cache(maxsize=8)
# def load_deep_dive_config() -> dict:
#     return load_yaml(os.path.join(CONFIG_DIR, 'deep_dive_config.yaml'))

# @lru_cache(maxsize=8)
# def load_system_config() -> dict:
#     return load_yaml(os.path.join(CONFIG_DIR, 'system_config.yaml'))


# # import yaml
# # import os
# # from functools import lru_cache

# # def load_yaml(file_path: str) -> dict:
# #     """
# #     Loads and returns the contents of a YAML file.
# #     Raises FileNotFoundError or ValueError if failed.
# #     """
# #     try:
# #         with open(file_path, 'r') as f:
# #             data = yaml.safe_load(f)
# #             if not isinstance(data, dict):
# #                 raise ValueError(f"YAML file {file_path} does not contain a valid dictionary.")
# #             return data
# #     except FileNotFoundError:
# #         raise FileNotFoundError(f"File not found: {file_path}")
# #     except yaml.YAMLError as e:
# #         raise ValueError(f"Invalid YAML in {file_path}: {e}")

# # @lru_cache(maxsize=8)
# # def load_metric_config() -> dict:
# #     path = os.path.join('configs', 'metric_config.yaml')
# #     return load_yaml(path)

# # @lru_cache(maxsize=8)
# # def load_system_definition(system: str) -> dict:
# #     # For now, just load system_definition.yaml (can be extended for per-system files)
# #     path = os.path.join('configs', 'system_definition.yaml')
# #     return load_yaml(path)

# # @lru_cache(maxsize=8)
# # def load_deep_dive_config() -> dict:
# #     path = os.path.join('configs', 'deep_dive_config.yaml')
# #     return load_yaml(path)

# # @lru_cache(maxsize=8)
# # def load_system_config() -> dict:
# #     path = os.path.join('configs', 'system_config.yaml')
# #     return load_yaml(path) 