#!/usr/bin/env python3
"""
scripts/extract-lagos-spatial-data.py
Fast X Nexus — Lagos Open-Source Geospatial Landmark & POI Extractor

Extracts and structures transit nodes, estate gates, bus stops, junctions,
markets, and micro-neighborhoods across all 20 Lagos State LGAs using
Overpass API / OpenStreetMap and Open Data repositories.
"""

import json
import os
import sys
import time
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'geo', 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'lagosLandmarksData.json')

LAGOS_BBOX = "6.32,3.12,6.75,3.75"

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]

OVERPASS_QUERY = f"""
[out:json][timeout:90][bbox:{LAGOS_BBOX}];
(
  // Transit nodes: Bus stops, stations, ferry terminals
  node["highway"="bus_stop"];
  node["public_transport"="platform"];
  node["amenity"="bus_station"];
  node["amenity"="ferry_terminal"];
  
  // Junctions and roundabouts
  node["junction"];
  node["highway"="motorway_junction"];
  
  // Estates and residential areas
  node["place"~"suburb|neighbourhood|quarter|isolated_dwelling"];
  node["residential"~"estate|gated"];
  
  // Major commercial hubs, markets, malls
  node["amenity"="marketplace"];
  node["shop"="mall"];
  node["shop"="supermarket"];
  
  // Major essential landmarks
  node["amenity"~"hospital|university|college|fuel"];
);
out body center 3000;
>;
out skel qt;
"""

def fetch_overpass_data():
    headers = {
        'User-Agent': 'FastXNexus-Logistics-Spatial-Extractor/1.0 (https://fastxnexus.com; contact@fastx.io)'
    }
    
    for server in OVERPASS_SERVERS:
        try:
            print(f"📡 Querying Overpass server: {server}...")
            res = requests.post(server, data={"data": OVERPASS_QUERY}, headers=headers, timeout=60)
            if res.status_code == 200:
                data = res.json()
                elements = data.get("elements", [])
                if elements:
                    print(f"✅ Successfully fetched {len(elements)} raw elements from {server}!")
                    return elements
            else:
                print(f"⚠️ Server returned status {res.status_code}. Trying next server...")
        except Exception as e:
            print(f"⚠️ Failed to connect to {server}: {e}. Trying next server...")
        time.sleep(1)
    
    return []

def determine_lga(lat, lng, name, district):
    # Geofenced heuristic for Lagos LGAs
    n_lower = f"{name} {district}".lower()
    
    if "ikorodu" in n_lower or "igbogbo" in n_lower or "oreyo" in n_lower or (lat >= 6.55 and lng >= 3.48):
        return "Ikorodu"
    if "lekki" in n_lower or "vgc" in n_lower or "ajah" in n_lower or "ikate" in n_lower or "sangotedo" in n_lower or (lat <= 6.48 and lng >= 3.48):
        return "Eti-Osa / Ibeju-Lekki"
    if "ikeja" in n_lower or "alausa" in n_lower or "allen" in n_lower or "opregun" in n_lower or (lat >= 6.57 and lat <= 6.64 and lng >= 3.32 and lng <= 3.38):
        return "Ikeja"
    if "isolo" in n_lower or "jakande" in n_lower or "oshodi" in n_lower or "ejigbo" in n_lower or (lat >= 6.51 and lat <= 6.56 and lng >= 3.30 and lng <= 3.35):
        return "Oshodi-Isolo"
    if "surulere" in n_lower or "ojuelegba" in n_lower or "bode thomas" in n_lower or (lat >= 6.49 and lat <= 6.53 and lng >= 3.34 and lng <= 3.38):
        return "Surulere"
    if "yaba" in n_lower or "akoka" in n_lower or "ebute metta" in n_lower or (lat >= 6.49 and lat <= 6.53 and lng >= 3.37 and lng <= 3.40):
        return "Lagos Mainland"
    if "victoria island" in n_lower or "vi" in n_lower or "ikoyi" in n_lower or "marina" in n_lower or (lat <= 6.46 and lng >= 3.39 and lng <= 3.46):
        return "Lagos Island / Eti-Osa"
    if "alimosho" in n_lower or "iyana ipaja" in n_lower or "egbeda" in n_lower or "igando" in n_lower:
        return "Alimosho"
    if "festac" in n_lower or "amuwo" in n_lower or "satellite" in n_lower or "mile 2" in n_lower:
        return "Amuwo-Odofin"
    if "agege" in n_lower or "pen cinema" in n_lower or "dopemu" in n_lower:
        return "Agege"
    if "kosofe" in n_lower or "ojota" in n_lower or "ketu" in n_lower or "mile 12" in n_lower or "magodo" in n_lower:
        return "Kosofe"
    if "gbagada" in n_lower or "bariga" in n_lower or "somolu" in n_lower:
        return "Somolu"
    
    return "Lagos Metropolitan Area"

def build_aliases(name, subdistrict, lga):
    aliases = set()
    cleaned = name.lower().strip()
    aliases.add(cleaned)
    
    # Strip common noise
    stripped = cleaned.replace("bus stop", "").replace("junction", "").replace("roundabout", "").replace("estate", "").replace("filling station", "").strip()
    if len(stripped) >= 3:
        aliases.add(stripped)
    
    # Combined with subdistrict
    if subdistrict:
        aliases.add(f"{cleaned} {subdistrict.lower()}")
        if len(stripped) >= 3:
            aliases.add(f"{stripped} {subdistrict.lower()}")
            
    # Combined with LGA
    if lga and lga != "Lagos Metropolitan Area":
        aliases.add(f"{cleaned} {lga.lower()}")
        if len(stripped) >= 3:
            aliases.add(f"{stripped} {lga.lower()}")
            
    return list(aliases)

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    raw_elements = fetch_overpass_data()
    landmarks = []
    seen = set()
    
    for el in raw_elements:
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en") or tags.get("official_name")
        if not name or len(name.strip()) < 3:
            continue
            
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lng = el.get("lon") or el.get("center", {}).get("lon")
        if not lat or not lng:
            continue
            
        # Strict Lagos bounding check
        if not (6.32 <= lat <= 6.75 and 3.12 <= lng <= 3.75):
            continue
            
        key = f"{name.lower()}_{round(lat, 3)}_{round(lng, 3)}"
        if key in seen:
            continue
        seen.add(key)
        
        # Categorize
        category = "general"
        specificity = 2
        
        if "bus_stop" in tags.values() or "platform" in tags.values() or "bus_station" in tags.values():
            category = "transit"
            specificity = 1
        elif "junction" in tags or "junction" in tags.values() or "roundabout" in name.lower():
            category = "junction"
            specificity = 1
        elif "estate" in name.lower() or "residential" in tags:
            category = "estate"
            specificity = 2
        elif "marketplace" in tags.values() or "mall" in tags.values() or "market" in name.lower():
            category = "commercial"
            specificity = 2
        elif "hospital" in tags.values() or "university" in tags.values() or "fuel" in tags.values():
            category = "poi"
            specificity = 2
            
        subdistrict = tags.get("is_in:subdistrict") or tags.get("addr:subdistrict") or tags.get("addr:district") or tags.get("place") or ""
        lga = tags.get("is_in:city") or tags.get("addr:city") or determine_lga(lat, lng, name, subdistrict)
        
        aliases = build_aliases(name, subdistrict, lga)
        
        landmarks.append({
            "name": name.strip(),
            "category": category,
            "subDistrict": subdistrict or lga,
            "lga": lga,
            "state": "Lagos",
            "lat": round(lat, 5),
            "lng": round(lng, 5),
            "specificity": specificity,
            "aliases": aliases
        })
        
    print(f"📊 Processed {len(landmarks)} unique Lagos landmarks & POIs.")
    
    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(landmarks, f, ensure_ascii=False, indent=2)
        
    print(f"💾 Saved to {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
