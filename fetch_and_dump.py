# fetch_and_dump.py
import json
import os
import sys
from datetime import datetime, timedelta
from urllib.parse import quote
import requests

OUTPUT_DIR = "docs/data"
WOM_BASE = "https://api.wiseoldman.net/v2"
WOM_GROUP_ID = 10348  # change if you want
HISCORES_URL = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player={}"

# Fallback players if WOM & players.json are unavailable
DEFAULT_PLAYERS = ["vaOPA", "vaPEEXI", "vaRautaMake", "vaROSQIS"]

class SchemaError(RuntimeError):
    pass

# ----------------- schema.json loader -----------------
def load_schema():
    """
    Expects schema.json with:
      {
        "skills": ["Overall", "Attack", ...],
        "minigames": ["BH1", "BH2", ...]
      }
    """
    candidates = ["schema.json", os.path.join("docs", "schema.json")]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                raise SchemaError(f"{path} is not an object")
            skills = data.get("skills") or []
            minigames = data.get("minigames") or []
            if not isinstance(skills, list) or not isinstance(minigames, list):
                raise SchemaError(f"{path} must have 'skills' and 'minigames' arrays")
            if not skills:
                raise SchemaError(f"{path} contains empty 'skills'")
            return skills, minigames, path
    raise SchemaError("schema.json not found (looked in ./ and ./docs/)")

# ----------------- WOM player list (best-effort) -----------------
def fetch_wom_group_members(group_id: int, timeout=15):
    url = f"{WOM_BASE}/groups/{group_id}"
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    names, seen = [], set()
    for m in data.get("memberships", []):
        player = m.get("player") or {}
        name = (player.get("displayName") or player.get("username") or "").strip()
        if not name:
            continue
        key = name.lower()
        if key not in seen:
            seen.add(key)
            names.append(name)
    return names

# ----------------- Fetch / Parse hiscores -----------------
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
            "Update schema.json to match the new hiscores order."
        )

    # Skills
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

    # Minigames
    mg_out = {}
    offset = len(skills)
    for j, name in enumerate(minigames):
        parts = lines[offset + j].split(",")
        if len(parts) < 2:
            raise SchemaError(f"Malformed minigame line {j} for '{name}': {lines[offset+j]}")
        rank, score = parts[:2]
        mg_out[name] = {
            "rank": int(rank) if rank.lstrip("-").isdigit() else -1,
            "score": int(score) if score.lstrip("-").isdigit() else -1
        }

    return {"skills": skills_out, "minigames": mg_out}

# ----------------- File helpers -----------------
def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def player_file_name(player_name: str) -> str:
    safe = player_name.replace(" ", "_")
    return os.path.join(OUTPUT_DIR, f"{safe}.json")

def append_snapshot(player_name: str, parsed: dict):
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
        "custom_categories": {}  # keep for frontend compatibility
    }
    data["snapshots"].append(snap)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[ok] appended snapshot -> {path}")

def write_players_index(players: list[str]):
    ensure_output_dir()
    idx_path = os.path.join(OUTPUT_DIR, "players.json")
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    print(f"[ok] wrote players index -> {idx_path}")

# ----------------- Pruning -----------------
def prune_old_snapshots(path: str, keep_days: int = 7, min_keep: int = 30) -> int:
    """
    Keeps snapshots newer than `keep_days`. Always keeps at least `min_keep`.
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
        if iso.endswith("Z"):
            iso = iso[:-1]
        return datetime.fromisoformat(iso)

    snaps.sort(key=lambda s: parse_ts(s.get("timestamp", "1970-01-01T00:00:00")))
    kept = [s for s in snaps if parse_ts(s.get("timestamp", "1970-01-01T00:00:00")) >= cutoff]

    if len(kept) < min_keep:
        kept = snaps[-min_keep:]

    removed = len(snaps) - len(kept)
    if removed > 0:
        data["snapshots"] = kept
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[ok] pruned {removed} old snapshots from {path}")
    return removed

# ----------------- Player selection -----------------
def select_players() -> list[str]:
    # 1) Try WOM (best effort)
    try:
        names = fetch_wom_group_members(WOM_GROUP_ID)
        if names:
            print(f"[info] Loaded {len(names)} players from WOM group {WOM_GROUP_ID}")
            return names
        else:
            print(f"[warn] WOM group {WOM_GROUP_ID} returned 0 players.")
    except Exception as e:
        print(f"[warn] WOM fetch failed: {e}")

    # 2) Try existing players.json (from previous runs)
    idx_path = os.path.join(OUTPUT_DIR, "players.json")
    if os.path.exists(idx_path):
        try:
            with open(idx_path, "r", encoding="utf-8") as f:
                maybe = json.load(f)
            if isinstance(maybe, list) and maybe:
                print(f"[info] Loaded {len(maybe)} players from players.json")
                return maybe
        except Exception as e:
            print(f"[warn] Failed to read players.json: {e}")

    # 3) Fallback static list
    print(f"[info] Falling back to DEFAULT_PLAYERS ({len(DEFAULT_PLAYERS)})")
    return DEFAULT_PLAYERS

# ----------------- Main -----------------
def main():
    # Load the single source of truth
    try:
        skills, minigames, schema_path = load_schema()
        print(f"[info] Loaded schema from {schema_path} ({len(skills)} skills, {len(minigames)} minigames)")
    except SchemaError as e:
        print(f"[FAIL] {e}")
        sys.exit(2)

    players = select_players()
    write_players_index(players)

    failures = 0
    for name in players:
        raw = fetch_raw(name)
        if not raw:
            failures += 1
            continue
        try:
            parsed = parse_index_lite(raw, skills, minigames)
        except SchemaError as e:
            print(f"[FAIL] {name}: {e}")
            sys.exit(2)  # fail fast so you notice schema drift immediately
        append_snapshot(name, parsed)
        prune_old_snapshots(player_file_name(name), keep_days=7, min_keep=30)

    if failures:
        print(f"[warn] {failures} player(s) failed to fetch.")

if __name__ == "__main__":
    main()
