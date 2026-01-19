export  function InfoPanel({ loading, error, searchMeta }) {
  const { type, value, count } = searchMeta;

  const typeLabel =
    type === "plz" ? "Postleitzahl" : type === "city" ? "Stadt" : type === "state" ? "Bundesland" : "";

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        border: "1px solid #ddd",
        borderRadius: "10px",
        marginBottom: "1rem",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <b>Status:</b>{" "}
          {loading ? "Lädt..." : error ? "Fehler" : type ? "Bereit" : "Warte auf Suche"}
        </div>

        {type && (
          <div>
            <b>Suche:</b> {typeLabel} — <code>{value}</code>
          </div>
        )}

        {type && !loading && !error && (
          <div>
            <b>Treffer:</b> {count}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: "0.5rem", color: "#b00020" }}>
          {error}
        </div>
      )}
    </div>
  );
}
