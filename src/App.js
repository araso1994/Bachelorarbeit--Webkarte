import { useState } from "react";
import Header from "./Header";
import MapView from "./MapView";
import SearchBar from "./SearchBar";
import ResultsList from "./ResultsList";
import InfoPanel from "./InfoPanel";
import RichInfoPanel from "./RichInfoPanel";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [markers, setMarkers] = useState([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [info, setInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchMeta, setSearchMeta] = useState({
    type: "",
    value: "",
    count: 0,
  });

  const handleSearch = async ({ type, value }) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setMarkers([]);
    setInfo(null);
    setSelectedMarkerId(null);
    setSearchMeta({ type, value: trimmed, count: 0 });

    try {
      let url = "";
      if (type === "plz") {
        url = `${API_BASE}/api/search/plz/${encodeURIComponent(trimmed)}`;
      } else if (type === "city") {
        url = `${API_BASE}/api/search/city/${encodeURIComponent(trimmed)}`;
      } else if (type === "state") {
        url = `${API_BASE}/api/search/state/${encodeURIComponent(trimmed)}`;
      } else {
        throw new Error("Unbekannter Suchtyp: " + type);
      }

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend Fehler ${res.status}: ${text}`);
      }

      const payload = await res.json();
      const list = Array.isArray(payload?.markers) ? payload.markers : [];

      const normalized = list
        .filter((m) => m && m.lat != null && m.lon != null)
        .map((m) => ({
          ...m,
          lat: Number(m.lat),
          lon: Number(m.lon),
        }));

      setMarkers(normalized);
      setInfo(payload?.info || null);
      setSearchMeta((prev) => ({
        ...prev,
        count: payload?.count ?? normalized.length,
      }));

      if (normalized.length === 0) {
        // ❗ kein "harter Fehler": nur Hinweis
        setError("Keine Treffer gefunden.");
        return;
      }

      setSelectedMarkerId(normalized[0].id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unerwarteter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMarker = (markerId) => {
    setSelectedMarkerId(markerId);
  };

  return (
    <div className="App">
      <Header />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem" }}>
        <SearchBar onSearch={handleSearch} />

        <RichInfoPanel
          loading={loading}
          error={error}
          searchMeta={searchMeta}
          info={info}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "1rem",
          }}
        >
          <ResultsList
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectMarker}
          />

          <MapView
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectMarker}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
