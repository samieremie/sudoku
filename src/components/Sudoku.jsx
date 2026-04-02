import { useState, useEffect } from "react";
import { fetchBoardByDifficulty } from "../api/sudokuService";
import clsx from "clsx";
import "./Sudoku.css";

export default function Sudoku() {
  // State values
  const [grid, setGrid] = useState(null);
  const [initialGrid, setInitialGrid] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [selectedNum, setSelectedNum] = useState(null);
  const [lives, setLives] = useState(3);
  const [showError, setShowError] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewCell, setPreviewCell] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Derived states
  const isGameLost = lives <= 0;
  const isGameWon =
    grid &&
    grid.every((row, rowIndex) => row.every((cell, colIndex) => cell !== 0));

  const numberCounts =
    grid?.flat().reduce((counts, cell) => {
      if (cell !== 0) {
        counts[cell] = (counts[cell] || 0) + 1;
      }
      return counts;
    }, {}) || {};

  // Initialize the sudoku game
  useEffect(() => {
    const controller = new AbortController(); // 1. Create the "Stop" button
    const signal = controller.signal;

    setLoading(true);
    setPreviewCell(null);

    fetchBoardByDifficulty(difficulty, signal) // 2. Pass the signal to your service
      .then((data) => {
        if (data) {
          const originalBoard = data.value.map((row) => [...row]);
          const boardCopy = data.value.map((row) => [...row]);
          setGrid(boardCopy);
          setInitialGrid(originalBoard);
        } else if (!controller.signal.aborted) {
          // Only throw error if the search actually finished without finding anything
          throw new Error(`No ${difficulty} board found`);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    // 4. THE CLEANUP: React runs this before starting the next effect
    return () => controller.abort();
  }, [difficulty]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTouch = () => {
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      setIsMobile(hasCoarsePointer || hasTouch);
    };

    checkTouch();
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    mediaQuery.addEventListener("change", checkTouch);
    return () => mediaQuery.removeEventListener("change", checkTouch);
  }, []);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-dots" aria-hidden="true">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
          <p>Chargement</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>Erreur lors du chargement</h2>
          <button
            type="button"
            className="error-button"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      </div>
    );

  function isValidPlacement(grid, rowIndex, colIndex, number) {
    if (grid[rowIndex].includes(number)) return false;

    for (let r = 0; r < grid.length; r += 1) {
      if (grid[r][colIndex] === number) return false;
    }

    const startRow = Math.floor(rowIndex / 3) * 3;
    const startCol = Math.floor(colIndex / 3) * 3;

    for (let r = startRow; r < startRow + 3; r += 1) {
      for (let c = startCol; c < startCol + 3; c += 1) {
        if (grid[r][c] === number) return false;
      }
    }

    return true;
  }

  function placeNumber(rowIndex, colIndex) {
    if (isGameLost || isGameWon || selectedNum === null) return;

    if (selectedNum === 0) {
      if (!initialGrid || initialGrid[rowIndex][colIndex] !== 0) return;
      if (grid[rowIndex][colIndex] === 0) return;

      setGrid((currentGrid) =>
        currentGrid.map((row, r) =>
          r === rowIndex
            ? row.map((cell, c) => (c === colIndex ? 0 : cell))
            : [...row],
        ),
      );
      return;
    }

    if (grid[rowIndex][colIndex] !== 0) return;

    if (!isValidPlacement(grid, rowIndex, colIndex, selectedNum)) {
      setShowError(true);
      setLives((currentLives) => Math.max(0, currentLives - 1));
      window.setTimeout(() => setShowError(false), 250);
      return;
    }

    setGrid((currentGrid) =>
      currentGrid.map((row, r) =>
        r === rowIndex
          ? row.map((cell, c) => (c === colIndex ? selectedNum : cell))
          : [...row],
      ),
    );
  }

  function handleLeftClick(rowIndex, colIndex) {
    if (isMobile) {
      if (
        !previewCell ||
        previewCell.rowIndex !== rowIndex ||
        previewCell.colIndex !== colIndex
      ) {
        setPreviewCell({ rowIndex, colIndex });
        return;
      }

      if (selectedNum === null) return;
      placeNumber(rowIndex, colIndex);
      setPreviewCell(null);
      return;
    }

    placeNumber(rowIndex, colIndex);
  }

  function handlePreviewClick(rowIndex, colIndex) {
    if (selectedNum === null) return;
    placeNumber(rowIndex, colIndex);
    setPreviewCell(null);
  }

  function restartGame() {
    setLives(3);
    setSelectedNum(null);
    setShowError(false);
    setPreviewCell(null);
    setLoading(true);
    setError(null);

    fetchBoardByDifficulty(difficulty)
      .then((data) => {
        if (!data) {
          throw new Error(`No ${difficulty} board found`);
        }

        const originalBoard = data.value.map((row) => [...row]);
        const boardCopy = data.value.map((row) => [...row]);
        setGrid(boardCopy);
        setInitialGrid(originalBoard);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const gridElements = grid.map((row, rowIndex) => {
    return row.map((cell, colIndex) => {
      const isNumberSelected = selectedNum !== null && selectedNum !== 0;
      const containsSelected = isNumberSelected && cell === selectedNum;
      const rowHasSelected =
        isNumberSelected && row.some((value) => value === selectedNum);
      const colHasSelected =
        isNumberSelected && grid.some((line) => line[colIndex] === selectedNum);
      const isUserFilled =
        selectedNum === 0 &&
        initialGrid?.[rowIndex]?.[colIndex] === 0 &&
        cell !== 0;

      const className = clsx("cell", {
        "cell-highlight":
          !containsSelected && (rowHasSelected || colHasSelected),
        "cell-value-match": containsSelected,
        "cell-user-filled": isUserFilled,
      });

      return (
        <button
          key={`${rowIndex}-${colIndex}`}
          className={className}
          onClick={() => handleLeftClick(rowIndex, colIndex)}
        >
          {cell === 0 ? "" : cell}
        </button>
      );
    });
  });

  function handleSelection(num) {
    setSelectedNum(num);
  }

  const numbersElements = [];
  for (let num = 1; num <= 9; num++) {
    const completed = numberCounts[num] === 9;
    const className = clsx("number", {
      selected: selectedNum === num,
      completed,
    });
    const label = completed ? "✓" : num;
    const newElement = (
      <button
        key={num}
        className={className}
        onClick={() => handleSelection(num)}
      >
        {label}
      </button>
    );
    numbersElements.push(newElement);
  }

  numbersElements.push(
    <button
      key="delete"
      className={clsx("number", "delete-button", {
        selected: selectedNum === 0,
      })}
      onClick={() => handleSelection(0)}
    >
      X
    </button>,
  );

  const mobilePreview =
    isMobile && previewCell ? (
      <div
        className="mobile-preview-overlay"
        onClick={() => setPreviewCell(null)}
      >
        <div
          className="mobile-preview-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mobile-preview-block">
            {Array.from({ length: 9 }, (_, index) => {
              const startRow = Math.floor(previewCell.rowIndex / 3) * 3;
              const startCol = Math.floor(previewCell.colIndex / 3) * 3;
              const rowIndex = startRow + Math.floor(index / 3);
              const colIndex = startCol + (index % 3);
              const value = grid[rowIndex][colIndex];
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  className={clsx("mobile-preview-block-cell", {
                    selected:
                      previewCell.rowIndex === rowIndex &&
                      previewCell.colIndex === colIndex,
                  })}
                  onClick={() => handlePreviewClick(rowIndex, colIndex)}
                >
                  {value === 0 ? "" : value}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="grid-container">
      <div className={clsx("grid-wrapper", { "error-flash": showError })}>
        <header className="page-header">
          <div className="difficulty-row">
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
          </div>
          <div className="game-info">
            <div
              className="lives"
              aria-label={`Lives remaining: ${lives} out of 3`}
            >
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  key={index}
                  className={clsx("heart", { filled: index < lives })}
                >
                  ♥
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="sudoku-grid">{gridElements}</div>
        <div className="numbers">{numbersElements}</div>
      </div>
      {(isGameLost || isGameWon) && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>{isGameWon ? "Tu as gagné !" : "Tu as perdu !"}</h2>
            <button className="restart-button" onClick={restartGame}>
              Rejouer
            </button>
          </div>
        </div>
      )}
      {mobilePreview}
    </div>
  );
}
