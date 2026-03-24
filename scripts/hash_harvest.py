import os
import json
import requests
from pathlib import Path

TEMPLATES_DIR = "resources/templates"

def harvest_hashes(output_root):
    print("Initializing Dynamic Hash Harvest...")
    
    templates_path = Path(TEMPLATES_DIR)
    if not templates_path.exists():
        print(f"Templates directory not found: {TEMPLATES_DIR}")
        return

    # Game -> Hash Map
    game_hash_maps = {} 

    # Canonical Name Mappings
    NAME_OVERRIDES = {
        "TravellerBoy": "Aether",
        "TravellerGirl": "Lumine"
    }

    for template_file in templates_path.glob("*.json"):
        with open(template_file, "r") as f:
            template = json.load(f)
            
        repo = template.get("hash_repo")
        if not repo:
            continue
            
        # Determine Game ID (executable name)
        executables = template.get("executables", [])
        if not executables:
            print(f"Skipping {template.get('name')} - No executables defined")
            continue
            
        game_id = executables[0].lower() # e.g. "genshinimpact.exe"
        if game_id not in game_hash_maps:
            game_hash_maps[game_id] = {}
            
        print(f"\nProcessing {template.get('name')} -> {game_id} (Repo: {repo})...")
        hash_map = game_hash_maps[game_id]
        
        base_url = f"https://api.github.com/repos/{repo}/contents/PlayerCharacterData"
        raw_base_url = f"https://raw.githubusercontent.com/{repo}/main/PlayerCharacterData"
        
        try:
            response = requests.get(base_url)
            if response.status_code != 200:
                print(f"  Failed to list directories for {repo}: {response.status_code}")
                continue
                
            items = response.json()
            for item in items:
                if item["type"] == "dir":
                    raw_name = item["name"]
                    char_name = NAME_OVERRIDES.get(raw_name, raw_name)
                    hash_url = f"{raw_base_url}/{raw_name}/hash.json"
                    
                    print(f"  Fetching {char_name}...", end="\r")
                    try:
                        h_res = requests.get(hash_url)
                        if h_res.status_code == 200:
                            data_list = h_res.json() # It's a LIST
                            if not isinstance(data_list, list):
                                data_list = [data_list]
                            
                            for component in data_list:
                                # Geometry Hashes
                                if component.get("position_vb"):
                                    hash_map[component["position_vb"]] = char_name
                                if component.get("ib"):
                                    hash_map[component["ib"]] = char_name
                                    
                                # Texture Hashes
                                if "texture_hashes" in component:
                                    for entry_list in component["texture_hashes"]:
                                        for entry in entry_list:
                                            # entry is [Type, Ext, Hash]
                                            if len(entry) >= 3:
                                                hash_map[entry[2]] = char_name
                        elif h_res.status_code == 404:
                            pass
                    except Exception as e:
                        print(f"\n  Warning: Error processing {char_name}: {e}")
        except Exception as e:
            print(f"  Failed to process {repo}: {e}")

    print(f"\n\nSuccess! Harvested hashes for {len(game_hash_maps)} games.")
    
    output_dir = Path(output_root)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for game_id, hash_map in game_hash_maps.items():
        print(f"  {game_id}: {len(hash_map)} hashes")
        
        final_data = {
            "characters": hash_map
        }
        
        out_file = output_dir / f"{game_id}.json"
        with open(out_file, "w") as f:
            json.dump(final_data, f, indent=2)
            
    print(f"Hash databases written to {output_dir}")

if __name__ == "__main__":
    harvest_hashes("resources/hashes")
