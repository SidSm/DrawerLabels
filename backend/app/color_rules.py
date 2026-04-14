import os
from pathlib import Path
from typing import Optional
import yaml

_CONFIG_PATH = Path(__file__).parent.parent / "config" / "label_colors.yaml"
_rules: list[dict] = []
_default: Optional[str] = None


def _load():
    global _rules, _default
    with open(_CONFIG_PATH) as f:
        data = yaml.safe_load(f)
    rules = data.get("rules", [])
    # Sort by prefix length descending so longer prefixes match first
    rules.sort(key=lambda r: len(r["prefix"]), reverse=True)
    _rules = rules
    _default = data.get("default")


_load()


def color_for_title(title: str) -> Optional[str]:
    for rule in _rules:
        if title.startswith(rule["prefix"]):
            return rule["color"]
    return _default


def reload():
    _load()
