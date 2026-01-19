export default function RichInfoPanel({ loading, error, searchMeta, info }) {
  const { type, value, count } = searchMeta || {};

  const typeLabel =
    type === "plz" ? "Postleitzahl" : type === "city" ? "Stadt" : type === "state" ? "Bundesland" : "";

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "12px",
        marginBottom: "1rem",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <b>Status:</b> {loading ? "Lädt..." : error ? "Fehler" : type ? "Bereit" : "Warte auf Suche"}
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
        <div style={{ marginTop: "0.75rem", color: "#b00020" }}>
          {error}
        </div>
      )}

      {!loading && !error && info && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {info.thumbnail && (
            <img
              src={info.thumbnail}
              alt={info.title || "Bild"}
              style={{ width: "92px", height: "92px", objectFit: "cover", borderRadius: "10px" }}
            />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {info.title || "Information"}
            </div>

            <div style={{ color: "#333", lineHeight: 1.4 }}>
              {info.summary || "Keine Beschreibung verfügbar."}
            </div>

            {info.url && (
              <div style={{ marginTop: "0.5rem" }}>
                <a href={info.url} target="_blank" rel="noreferrer">
                  Mehr auf Wikipedia ansehen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
