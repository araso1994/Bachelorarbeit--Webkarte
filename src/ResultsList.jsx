export default function ResultsList({ markers, selectedMarkerId, onSelectMarker }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
        height: "500px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #eee" }}>
        <b>Ergebnisse</b>
      </div>

      <div style={{ overflowY: "auto" }}>
        {(!markers || markers.length === 0) && (
          <div style={{ padding: "1rem", color: "#666" }}>
            Keine Ergebnisse.
          </div>
        )}

        {markers &&
          markers.map((m) => {
            const active = m.id === selectedMarkerId;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMarker(m.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.75rem 1rem",
                  border: "none",
                  borderBottom: "1px solid #f2f2f2",
                  background: active ? "#f3f6ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: "0.9rem", color: "#444" }}>
                  PLZ: {m.postalCode} • {m.state ?? "Unbekannt"}
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
