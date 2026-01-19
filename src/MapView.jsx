import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";


// Fix für Marker-Icons in React (CRA/Vite), sonst sind Marker oft "unsichtbar"
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * Option A : Kein Auto-Zoom.
 * Stattdessen: Karte nur sanft zum aktuell ausgewählten Marker "pannen".
 */
function PanToSelected({ markers, selectedMarkerId }) {
  const map = useMap();

  useEffect(() => {
    if (!markers || markers.length === 0) return;
    if (!selectedMarkerId) return;

    const selected = markers.find((m) => m.id === selectedMarkerId);
    if (!selected) return;

    map.panTo([selected.lat, selected.lon], { animate: true });
  }, [markers, selectedMarkerId, map]);

  return null;
}

export default function MapView({ markers = [], selectedMarkerId, onSelectMarker }) {

    console.log("MapView geladen ✅", {
    markersLength: markers.length,
    selectedMarkerId,
  });
  const defaultCenter = [51.1657, 10.4515]; // Deutschland Mitte
  const defaultZoom = 6;

  // Wenn ein Marker ausgewählt ist, zentrieren wir initial grob auf den ersten Marker,
  // aber OHNE Zoom-Änderung. (Nur als Startpunkt – PanToSelected übernimmt danach.)
  const initialCenter =
    markers && markers.length > 0 ? [markers[0].lat, markers[0].lon] : defaultCenter;

  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <MapContainer
        center={initialCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <PanToSelected markers={markers} selectedMarkerId={selectedMarkerId} />

        {markers &&
          markers.map((m) => {
            const isSelected = m.id === selectedMarkerId;

            return (
              <Marker
                key={m.id}
                position={[Number(m.lat), Number(m.lon)]}
                eventHandlers={{
                  click: () => onSelectMarker && onSelectMarker(m.id),
                }}
              >
                <Popup>
                  <b>{m.name}</b>
                  <br />
                  PLZ: {m.postalCode}
                  <br />
                  Bundesland: {m.state ?? "Unbekannt"}
                  {isSelected && (
                    <>
                      <br />
                      <i>Ausgewählt</i>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
