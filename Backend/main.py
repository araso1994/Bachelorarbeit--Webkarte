from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote
import time
import httpx
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# App + CORS
# ============================================================
app = FastAPI(title="BUW PLZ-Karte Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Config
# ============================================================
OPENPLZ_BASE = "https://openplzapi.org"
PHOTON_BASE = "https://photon.komoot.io/api"
WIKI_LANG = "de"


USER_AGENT = "BUW-PLZ-Karte/1.0 (Bachelorarbeit; Kontakt: aras.ahmad1@uni-wuppertal.de)"

# ============================================================
# Cache (Performance)
# ============================================================
# OpenPLZ: häufige Wiederholungen -> kurzer TTL
openplz_cache: TTLCache = TTLCache(maxsize=5000, ttl=60 * 10)  # 10 Minuten
# Photon: mittel (Ortskoordinaten ändern sich nicht oft)
photon_cache: TTLCache = TTLCache(maxsize=5000, ttl=60 * 60)  # 1 Stunde
# Wikipedia: sehr stabil
wiki_cache: TTLCache = TTLCache(maxsize=2000, ttl=60 * 60 * 24)  # 24 Stunden


@app.get("/")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ============================================================
# Helpers
# ============================================================
def _extract_items(payload: Any) -> List[Dict[str, Any]]:
    """
    OpenPLZ payload kann sein:
    - Liste von dicts
    - dict mit 'content': [ ... ]
    """
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        if isinstance(payload.get("content"), list):
            return [x for x in payload["content"] if isinstance(x, dict)]
        if isinstance(payload.get("items"), list):
            return [x for x in payload["items"] if isinstance(x, dict)]
    return []


async def fetch_openplz(path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    params = params or {}
    key: Tuple[str, Tuple[Tuple[str, Any], ...]] = (path, tuple(sorted(params.items())))
    if key in openplz_cache:
        return openplz_cache[key]

    url = f"{OPENPLZ_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                url,
                params=params,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json",
                },
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502, detail=f"OpenPLZ upstream error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"OpenPLZ request failed: {repr(e)}"
        )

    openplz_cache[key] = data
    return data


async def fetch_wikipedia_summary(
    title: str, lang: str = WIKI_LANG
) -> Optional[Dict[str, Any]]:
    """
    Wikipedia REST summary. Fail-safe + Cache.
    """
    title = (title or "").strip()
    if not title:
        return None

    cache_key = (lang, title.lower())
    if cache_key in wiki_cache:
        return wiki_cache[cache_key]

    safe_title = quote(title)
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{safe_title}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json",
                    "Accept-Language": "de",
                },
            )
            if r.status_code != 200:
                wiki_cache[cache_key] = None
                return None
            data = r.json()

        result = {
            "title": data.get("title"),
            "summary": data.get("extract"),
            "url": (data.get("content_urls") or {}).get("desktop", {}).get("page"),
            "thumbnail": (data.get("thumbnail") or {}).get("source"),
        }
        wiki_cache[cache_key] = result
        return result
    except Exception:
        wiki_cache[cache_key] = None
        return None


async def fetch_from_photon(
    query: str, limit: int = 10, lang: str = "de"
) -> List[Dict[str, Any]]:
    """
    Photon (Komoot) Geocoding.
    Liefert Features mit geometry.coordinates [lon, lat].
    """
    q = (query or "").strip()
    if not q:
        return []

    cache_key = (q.lower(), limit, lang)
    if cache_key in photon_cache:
        return photon_cache[cache_key]

    params = {
        "q": q,
        "limit": limit,
        "lang": lang,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                PHOTON_BASE,
                params=params,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json",
                    "Accept-Language": "de",
                },
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502, detail=f"Photon upstream error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Photon request failed: {repr(e)}")

    features = (data or {}).get("features", []) or []
    markers: List[Dict[str, Any]] = []

    for f in features:
        props = f.get("properties") or {}
        geom = f.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if not (isinstance(coords, list) and len(coords) == 2):
            continue

        lon, lat = coords[0], coords[1]
        try:
            lat = float(lat)
            lon = float(lon)
        except Exception:
            continue

        markers.append(
            {
                "id": str(
                    props.get("osm_id")
                    or props.get("name")
                    or f.get("type")
                    or f.get("properties")
                ),
                "name": props.get("name") or q,
                "postalCode": props.get("postcode"),
                "state": props.get("state"),
                "lat": lat,
                "lon": lon,
                "source": "photon",
            }
        )

    photon_cache[cache_key] = markers
    return markers


# ============================================================
# API Endpoints
# ============================================================


@app.get("/api/search/plz/{postal_code}")
async def search_plz(postal_code: str) -> Dict[str, Any]:
    postal_code = (postal_code or "").strip()
    start_time = time.time()

    if not postal_code or not postal_code.isdigit() or len(postal_code) != 5:
        raise HTTPException(
            status_code=400, detail="postal_code invalid (expected 5 digits)"
        )

    payload = await fetch_openplz(
        "/de/Localities",
        params={"postalCode": postal_code, "page": 1, "pageSize": 50},
    )
    items = _extract_items(payload)

    # --- 1) Marker aus OpenPLZ (falls coords existieren) ---
    markers: List[Dict[str, Any]] = []

    # Hint für Wikipedia + Photon-Fallback (Ort/Bundesland)
    name_hint: Optional[str] = None
    state_hint: Optional[str] = None

    if items:
        # mögliche Felder: name / municipality etc.
        name_hint = (
            items[0].get("name") or items[0].get("municipality") or ""
        ).strip() or None
        fs = items[0].get("federalState") or {}
        if isinstance(fs, dict):
            state_hint = (fs.get("name") or "").strip() or None

    for item in items:
        lat = item.get("latitude")
        lon = item.get("longitude")

        print("DEBUG PLZ item:", item.get("name"), lat, lon)

        if lat is None or lon is None:
            continue

        markers.append(
            {
                "id": f"{postal_code}-{item.get('name')}",
                "name": item.get("name") or name_hint or f"PLZ {postal_code}",
                "postalCode": item.get("postalCode") or postal_code,
                "state": (item.get("federalState") or {}).get("name") or state_hint,
                "lat": float(lat),
                "lon": float(lon),
                "source": "openplz",
            }
        )

    # --- 2) FALLBACK: Photon, wenn OpenPLZ keine coords liefert ---
    if not markers:
        # Query möglichst präzise: PLZ + Ort + Deutschland
        if name_hint:
            q = f"{postal_code} {name_hint}, Deutschland"
        else:
            q = f"{postal_code}, Deutschland"

        photon_markers = await fetch_from_photon(q, limit=10, lang="de")

        # postalCode/state ggf. ergänzen
        normalized: List[Dict[str, Any]] = []
        for m in photon_markers:
            normalized.append(
                {
                    "id": str(m.get("id")),
                    "name": m.get("name") or name_hint or f"PLZ {postal_code}",
                    "postalCode": postal_code,  # wichtig: sicher setzen
                    "state": m.get("state") or state_hint,
                    "lat": float(m.get("lat")),
                    "lon": float(m.get("lon")),
                    "source": "photon",
                }
            )
        markers = normalized

    wiki_title = name_hint
    if not wiki_title and markers:
        wiki_title = markers[0].get("name")

    info = await fetch_wikipedia_summary(wiki_title, WIKI_LANG) if wiki_title else None

    end_time = time.time()
    print(f"Backend processing time (PLZ): {end_time - start_time:.3f} seconds")

    return {
        "query": {"type": "plz", "value": postal_code},
        "count": len(markers),
        "markers": markers,
        "info": info,
    }


@app.get("/api/search/city/{city_name}")
async def search_city(city_name: str) -> Dict[str, Any]:
    city_name = (city_name or "").strip()
    if not city_name:
        raise HTTPException(status_code=400, detail="city_name missing")

    # Photon: Stadt + Deutschland (bessere Relevanz)
    markers = await fetch_from_photon(f"{city_name}, Deutschland", limit=10, lang="de")
    info = await fetch_wikipedia_summary(city_name, WIKI_LANG)

    return {
        "query": {"type": "city", "value": city_name},
        "count": len(markers),
        "markers": markers,
        "info": info,
    }


@app.get("/api/search/state/{state_name}")
async def search_state(
    state_name: str,
    limit: int = Query(10, ge=1, le=25),
) -> Dict[str, Any]:
    state_name = (state_name or "").strip()
    if not state_name:
        raise HTTPException(status_code=400, detail="state_name missing")

    # Photon: Bundesland + Deutschland
    markers = await fetch_from_photon(
        f"{state_name}, Deutschland", limit=limit, lang="de"
    )
    info = await fetch_wikipedia_summary(state_name, WIKI_LANG)

    return {
        "query": {"type": "state", "value": state_name},
        "count": len(markers),
        "markers": markers,
        "info": info,
    }
