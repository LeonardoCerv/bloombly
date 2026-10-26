import json, random, os
random.seed(42)
src = "data/geojson/flowering_sites.geojson"
dst = "data/geojson/flowering_sites.sample.geojson"
TARGET = 30000

print("loading (this reads 467MB, ~momentito)...")
with open(src) as f:
    gj = json.load(f)
feats = gj.get("features", [])
n = len(feats)
print(f"total features: {n}")

# keep features that have coords + the props the globe uses
def ok(ft):
    g = ft.get("geometry") or {}
    return g.get("coordinates") and ft.get("properties")
feats = [f for f in feats if ok(f)]
print(f"valid features: {len(feats)}")

sample = feats if len(feats) <= TARGET else random.sample(feats, TARGET)

# round coordinates to 4 decimals (~11m) to shrink size
def round_coords(c):
    if isinstance(c, (int, float)):
        return round(c, 4)
    return [round_coords(x) for x in c]
for ft in sample:
    g = ft.get("geometry") or {}
    if "coordinates" in g:
        g["coordinates"] = round_coords(g["coordinates"])
    # drop null id to save bytes
    p = ft.get("properties") or {}
    if p.get("id") is None:
        p.pop("id", None)

out = {"type":"FeatureCollection","name":"Flowering_sites_sample","features":sample}
with open(dst,"w") as f:
    json.dump(out, f, separators=(",",":"))
sz = os.path.getsize(dst)/1e6
print(f"wrote {len(sample)} features -> {dst}  ({sz:.1f} MB)")
# show year range + a sample prop set for sanity
years = [ (f['properties'].get('year')) for f in sample if f['properties'].get('year') is not None]
if years: print(f"year range: {min(years)}-{max(years)}")
print("sample props:", sample[0]['properties'])
