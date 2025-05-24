from pydantic import BaseModel
from typing import List, Optional, Dict

class MetricRow(BaseModel):
    name: str
    value: float
    baseline: float
    change: float
    significance: str  # positive / negative / neutral

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
    metrics: List[MetricRow]
    key_insights: List[str]
    final_verdict: str
    scalability_verdict: ScalabilityVerdict

class DeepDiveResponse(BaseModel):
    segments: List[DeepDiveSegment] 