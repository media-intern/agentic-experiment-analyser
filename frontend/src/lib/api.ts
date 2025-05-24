export async function sendRequestJson(requestFile: File, system: string) {
  const formData = new FormData();
  formData.append('request_file', requestFile);
  formData.append('system', system);

  const response = await fetch('http://localhost:8000/api/analyze-request', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
}

export async function sendDeepDiveQuery(payload: { request_json: any; system: string; dimensions: string[] }) {
  const response = await fetch('http://localhost:8000/api/deep-dive-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
} 