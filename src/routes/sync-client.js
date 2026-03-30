export async function handleSyncPending(operations) {
  const results = {
    success: [],
    failed: [],
  };

  for (const op of operations) {
    try {
      const response = await fetch(`${API_BASE_URL}/sync/pending`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operations: [op] }),
      });

      if (response.ok) {
        const data = await response.json();
        results.success.push(data);
      } else {
        results.failed.push({ operation: op, status: response.status });
      }
    } catch (error) {
      results.failed.push({ operation: op, error: error.message });
    }
  }

  return results;
}

export default {
  handleSyncPending,
};
