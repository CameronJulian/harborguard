"use client";


import { fetchWithAuth } from "@/lib/auth-fetch";
import { useState } from "react";

export default function RerouteTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function testRoute() {
    setLoading(true);

    const response = await fetchWithAuth("/api/route-safety/reroute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: {
          lat: -33.9461,
          lng: 18.5874,
        },
        destination: {
          lat: -33.9180,
          lng: 18.4233,
        },
      }),
    });

    const data = await response.json();

    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Google Routes Test
      </h1>

      <button
        onClick={testRoute}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Loading..." : "Test Route"}
      </button>

      <pre className="mt-6 bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}


