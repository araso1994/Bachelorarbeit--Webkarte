import { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("plz"); // plz | city | state

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch({ type: filterType, value: query.trim() });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        margin: "1rem auto",
        maxWidth: "600px",
      }}
    >
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        style={{ padding: "0.4rem" }}
      >
        <option value="plz">Postleitzahl</option>
        <option value="city">Stadt</option>
        <option value="state">Bundesland</option>
      </select>

      <input
        type="text"
        placeholder="z.B. 42119 oder Berlin oder Bayern"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: 1, padding: "0.4rem" }}
      />

      <button type="submit" style={{ padding: "0.4rem 0.8rem" }}>
        Suchen
      </button>
    </form>
  );
}
