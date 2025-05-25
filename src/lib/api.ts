// src/lib/api.ts
/// <reference types="vite/client" />

// api.ts

// Dynamically detect if running in dev or in production build
const isDev = import.meta.env.MODE === "development";
const BASE_URL = isDev
  ? "http://localhost:8000/api"
  : "http://127.0.0.1:8000/api"; // FastAPI backend runs locally inside the app

console.log("🔧 API BASE_URL:", BASE_URL);

export async function sendRequestJson(file: File) {
  const formData = new FormData();
  formData.append('request_file', file);

  const response = await fetch(`${BASE_URL}/analyze-request`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
}

export async function uploadConfigFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload-config`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
}

export async function pingBackend() {
  try {
    const response = await fetch(`${BASE_URL}/ping`);
    return response.ok;
  } catch (error) {
    console.error("❌ Ping to backend failed:", error);
    return false;
  }
}

export async function sendDeepDiveQuery(payload: any) {
  const response = await fetch(`${BASE_URL}/deep-dive-query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
}


// const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";


// export async function sendRequestJson(file: File) {
//   const formData = new FormData();
//   formData.append('request_file', file);

//   const response = await fetch(`${BASE_URL}/analyze-request`, {
//     method: 'POST',
//     body: formData,
//   });

//   if (!response.ok) {
//     throw new Error(`Backend error: ${response.status} - ${await response.text()}`);
//   }

//   return await response.json();
// }

// export async function sendDeepDiveQuery(payload: any) {
//   const response = await fetch(`${BASE_URL}/deep-dive-query`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!response.ok) {
//     throw new Error(`Backend error: ${response.status} - ${await response.text()}`);
//   }

//   return await response.json();
// }


// // export async function sendRequestJson(file: File, system: string) {
// //     const formData = new FormData();
// //     formData.append("request_file", file);
// //     formData.append("system", system);
  
// //     const response = await fetch("https://agentic-experiment-analyser.onrender.com", {
// //       method: "POST",
// //       body: formData,
// //     });
  
// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       throw new Error(`Backend error: ${response.status} - ${errorText}`);
// //     }
  
// //     return await response.json();
// //   }
  
// //   export async function sendDeepDiveQuery(payload: {
// //     request_json: object;
// //     system: string;
// //     dimensions: string[];
// //   }, signal?: AbortSignal) {
// //     const response = await fetch("https://agentic-experiment-analyser.onrender.com", {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify(payload),
// //       signal,
// //     });
  
// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       throw new Error(`Deep Dive error: ${response.status} - ${errorText}`);
// //     }
  
// //     return await response.json();
// //   }
  
