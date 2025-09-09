// Test date logic
function getNYDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

function getTodayStart() {
  const today = getNYDate();
  // Create date string in YYYY-MM-DD format for NY timezone
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;
  return new Date(dateString + "T00:00:00.000Z");
}

const todayDate = getTodayStart();
const todayString = todayDate.toISOString().split("T")[0];

console.log("NY time:", getNYDate().toLocaleString());
console.log("Today start:", todayString);
console.log("Should be 2025-09-09");
