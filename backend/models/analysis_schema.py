from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class MetricRow(BaseModel):
    name: str
    control: Any
    # For multi-bucket: each bucket name maps to value, and each bucket_name_change maps to %change
    # These will be dynamic fields in the dicts returned by enhance_with_percentage_changes
    # So we use Any for flexibility

class AnalysisResult(BaseModel):
    metrics_table: List[MetricRow]
    summary: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class ScalabilityVerdict(BaseModel):
    verdict: str
    reasons: List[str]

class OverallAnalysisResponse(BaseModel):
    metrics_table: List[MetricRow]
    key_insights: List[str]
    final_verdict: str
    scalability_verdict: ScalabilityVerdict

class DeepDiveQuery(BaseModel):
    request_json: dict
    system: str
    dimensions: List[str]

class DeepDiveSegment(BaseModel):
    segment: str
    metrics: List[Dict[str, Any]]  # Now a list of dicts with dynamic keys for buckets/changes
    key_insights: List[str]
    final_verdict: Optional[str] = ""
    scalability_verdict: Optional[Dict[str, Any]] = None
    insight: Optional[str] = ""

class DeepDiveResponse(BaseModel):
    segments: List[DeepDiveSegment]
    overall_commentary: Optional[List[str]] = None