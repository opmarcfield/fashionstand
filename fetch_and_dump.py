import json
import os
import sys
from datetime import datetime, timedelta
from urllib.parse import quote

import requests

# ---------- Config ----------
HISCORES_URL = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player={}"
SCHEMA_PATH = os.getenv("SCHEMA_PATH", "schema.json")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "docs/data")
PLAYERS_ENV = os.getenv("PLAYERS", "")  # optional: comma-separated list
# ----------------------------

class SchemaError(RuntimeError):
    pass

def load_schema(path: str):
    with open(path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    skills = schema.get("skills") or []
    minigames = schema.get("minigames") or []
    if len(skills) != 24:
        raise SchemaError(f"Expected 24 skills, got {len(skills)}")
    if not minigames:
        raise SchemaError("Minigames list is empty")
    return skills, minigames

def fetch_raw(player_name: str, timeout=10) -> str | None:
    url = HISCORES_URL.format(quote(player_name, safe=""))
    r = requests.get(url, timeout=timeout)
    if r.status_code == 200:
        return r.text
    print(f"[warn] HTTP {r.status_code} for {player_name}")
    return None

def parse_index_lite(raw: str, skills: list[str], minigames: list[str]) -> dict:
    """
    Strict parser with guardrails:
    - Fails if total line count != len(skills) + len(minigames)
    - First len(skills) lines => skills (rank,level,experience)
    - Remaining lines => minigames (rank,score)
    """
    lines = raw.strip().split("\n")
    expected = len(skills) + len(minigames)
    if len(lines) != expected:
        raise SchemaError(
            f"Line count mismatch: got {len(lines)} lines, expected {expected}. "
            "Schema likely outdated (new/removed/reordered hiscore entry)."
        )

    # skills
    skills_out = {}
    for i, name in enumerate(skills):
        parts = lines[i].split(",")
        if len(parts) < 3:
            raise SchemaError(f"Malformed skill line {i} for '{name}': {lines[i]}")
        rank, level, xp = parts[:3]
        skills_out[name] = {
            "rank": int(rank) if rank.lstrip("-").isdigit() else -1,
            "level": int(level) if level.lstrip("-").isdigit() else -1,
            "experience": int(xp) if xp.lstrip("-").isdigit() else -1
        }

    # minigames
    mg_out = {}
    for j, name in enumerate(minigames):
        parts = lines[len(skills) + j].split(",")
        if len(parts) < 2:
            raise SchemaError(f"Malformed minigame line {j} for '{name}': {lines[len(skills)+j]}")
        rank, score = parts[:2]
        mg_out[name] = {
            "rank": int(rank) if rank.lstrip("-").isdigit() else -1,
            "score": int(score) if score.lstrip("-").isdigit() else -1
        }

    return {"skills": skills_out, "minigames": mg_out}

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def player_file_name(player_name: str) -> str:
    safe = player_name.replace(" ", "_")
    return os.path.join(OUTPUT_DIR, f"{safe}.json")

def append_snapshot(player_name: str, parsed: dict):
    """
    Appends a snapshot to docs/data/<player>.json:
    {
      "player_name": "...",
      "snapshots": [
        { "timestamp": "...", "skills": {...}, "minigames": {...} },
        ...
      ]
    }
    """
    ensure_output_dir()
    path = player_file_name(player_name)

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"player_name": player_name, "snapshots": []}

    snap = {
        "timestamp": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "skills": parsed["skills"],
        "minigames": parsed["minigames"],
        # You can add computed aggregates here if you want later
        "custom_categories": {}  # left empty; optional
    }
    data["snapshots"].append(snap)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[ok] appended snapshot -> {path}")

def write_players_index(players: list[str]):
    """
    Writes docs/data/players.json used by the frontend to avoid hardcoding names.
    """
    ensure_output_dir()
    idx_path = os.path.join(OUTPUT_DIR, "players.json")
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    print(f"[ok] wrote players index -> {idx_path}")

def prune_old_snapshots(path: str, keep_days: int = 7, min_keep: int = 30) -> int:
    """
    Suggestion: call this after append, or in a separate daily job.
    Keeps snapshots newer than `keep_days`. Always keeps at least `min_keep` most recent snapshots
    (protects against deleting your entire history if clock skew or bursty runs).
    Returns number of snapshots removed.
    """
    if not os.path.exists(path):
        return 0
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    snaps = data.get("snapshots", [])
    if not snaps:
        return 0

    cutoff = datetime.utcnow() - timedelta(days=keep_days)

    def parse_ts(iso: str) -> datetime:
        # tolerant ISO with trailing Z
        if iso.endswith("Z"):
            iso = iso[:-1]
        return datetime.fromisoformat(iso)

    # sort by timestamp ascending first (defensive)
    snaps.sort(key=lambda s: parse_ts(s.get("timestamp", "1970-01-01T00:00:00")))
    # filter by date
    kept = [s for s in snaps if parse_ts(s.get("timestamp", "1970-01-01T00:00:00")) >= cutoff]
    # ensure minimum retention
    if len(kept) < min_keep:
        kept = snaps[-min_keep:]

    removed = len(snaps) - len(kept)
    if removed > 0:
        data["snapshots"] = kept
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[ok] pruned {removed} old snapshots from {path}")
    return removed

def main():
    # 1) load schema
    skills, minigames = load_schema(SCHEMA_PATH)

    # 2) pick players
    if PLAYERS_ENV.strip():
        players = [p.strip() for p in PLAYERS_ENV.split(",") if p.strip()]
    else:
        # Fallback: edit this list or populate via env var
        players = ["vaOPA", "vaPEEXI", "vaRautaMake", "vaROSQIS"]

    write_players_index(players)

    # 3) fetch/parse/save
    failures = 0
    for name in players:
        raw = fetch_raw(name)
        if not raw:
            failures += 1
            continue
        try:
            parsed = parse_index_lite(raw, skills, minigames)
        except SchemaError as e:
            # HARD FAIL when schema doesn’t match — exactly what you wanted
            print(f"[FAIL] {name}: {e}")
            # non-zero exit: signal your scheduler to alert/stop
            sys.exit(2)
        append_snapshot(name, parsed)
        # OPTIONAL: prune here (or run in a separate job)
        path = player_file_name(name)
        prune_old_snapshots(path, keep_days=7, min_keep=30)

    # Non-zero if any HTTP fetch failed (but schema matched)
    if failures:
        sys.exit(1)

if __name__ == "__main__":
    main()
