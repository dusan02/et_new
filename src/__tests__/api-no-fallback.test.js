/**
 * Safety net test - ensures API NEVER returns old data as fallback
 * This test MUST pass - if it fails, the fallback bug has returned
 */

const https = require("https");
const http = require("http");

// Simple fetch polyfill for Node.js
function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
        });
      });
    });
    req.on("error", reject);
  });
}

// Simple test without Prisma - just test API response
describe("API No-Fallback Safety Net", () => {
  test("API NEVER returns old data when no data exists for today", async () => {
    // Make API request
    const response = await fetch("http://localhost:3000/api/earnings");
    const data = await response.json();

    // CRITICAL ASSERTIONS - these MUST pass
    expect(response.status).toBe(200);
    expect(data.status).toBe("no-data"); // Must be explicit no-data status
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(0); // Must be empty array
    expect(data.meta.fallbackUsed).toBe(false); // Must never use fallback

    console.log("✅ Safety net test passed - no old data returned");
    console.log("Response:", JSON.stringify(data, null, 2));
  });
});
