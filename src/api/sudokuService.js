const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function fetchBoardByDifficulty(targetDifficulty, signal) {
  const url =
    "https://sudoku-api.vercel.app/api/dosuku?query={newboard(limit:10){grids{value,solution,difficulty}}}";
  let foundBoard = null;
  let attempts = 0;

  console.log(`Searching for a "${targetDifficulty}" board...`);

  while (!foundBoard) {
    attempts++;
    try {
      const response = await fetch(url, { signal });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      const grids = data.newboard.grids;

      // Try to find the specific difficulty in this batch
      foundBoard = grids.find(
        (grid) =>
          grid.difficulty.toLowerCase() === targetDifficulty.toLowerCase(),
      );

      if (!foundBoard) {
        console.log("Not found, waiting 1 second before retry...");
        await delay(1000); // 3. The "Breathing Room"
      }
    } catch (error) {
      console.error("Request failed:", error.message);
      // Optional: Add a break or delay here to prevent infinite loops on API failure
      break;
    }
  }

  if (foundBoard) {
    console.log(
      `Success! Found a ${targetDifficulty} board after ${attempts} attempt(s).`,
    );
    return foundBoard;
  }
}
