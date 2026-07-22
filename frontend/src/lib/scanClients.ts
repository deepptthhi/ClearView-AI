// Empty string => relative path (same-origin), used when the backend
// serves the built frontend itself. Set VITE_API_BASE_URL to point
// elsewhere if the frontend and backend are deployed separately.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function scanUrl(url: string) {
    const response = await fetch(`${API_BASE_URL}/api/scan/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
    return response.json();
}
