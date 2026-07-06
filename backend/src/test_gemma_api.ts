const res = await fetch("http://localhost:3001/api/ai/map-columns", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    headers: ["Name", "Email", "Phone", "Notice Period"],
    sampleRows: [["John Doe", "john@gmail.com", "1234567890", "30 Days"]],
    importType: "candidates"
  })
});
console.log("Status:", res.status);
try {
  console.log(await res.json());
} catch (e: any) {
  console.log("Text response:", await res.text());
}
