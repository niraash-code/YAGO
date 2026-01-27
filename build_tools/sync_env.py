#!/usr/bin/env python3
import os
import json
import re

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_ENV = os.path.join(ROOT_DIR, '.env')
SRC_UI_ENV = os.path.join(ROOT_DIR, 'src-ui', '.env')
TAURI_CONF = os.path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json')

def read_env(path):
    env_vars = {}
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

def write_env(path, env_vars):
    with open(path, 'w') as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")
    print(f"Updated {path}")

def update_tauri_conf(port):
    if not os.path.exists(TAURI_CONF):
        print(f"Error: {TAURI_CONF} not found.")
        return

    with open(TAURI_CONF, 'r') as f:
        try:
            config = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error parsing {TAURI_CONF}: {e}")
            return

    new_dev_url = f"http://localhost:{port}"
    
    # Navigate to build.devUrl
    if 'build' in config and 'devUrl' in config['build']:
        current_url = config['build']['devUrl']
        if current_url != new_dev_url:
            print(f"Updating tauri.conf.json devUrl from {current_url} to {new_dev_url}")
            config['build']['devUrl'] = new_dev_url
            
            with open(TAURI_CONF, 'w') as f:
                json.dump(config, f, indent=2)
        else:
            print("tauri.conf.json devUrl is already up to date.")
    else:
        print("Warning: build.devUrl not found in tauri.conf.json")

def main():
    print("Syncing environment variables...")
    
    # 1. Read Root .env
    root_vars = read_env(ROOT_ENV)
    port = root_vars.get('VITE_PORT', '30000') # Default fallback

    # 2. Sync src-ui/.env
    ui_vars = read_env(SRC_UI_ENV)
    if ui_vars.get('VITE_PORT') != port:
        ui_vars['VITE_PORT'] = port
        write_env(SRC_UI_ENV, ui_vars)
    else:
        print("src-ui/.env is up to date.")

    # 3. Update Tauri Config
    update_tauri_conf(port)

    print("Environment sync complete.")

if __name__ == "__main__":
    main()
