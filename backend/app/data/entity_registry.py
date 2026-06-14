"""Known institutional client-name patterns mapped to parent entities."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class EntityPattern:
    parent: str
    category: str
    pattern: re.Pattern[str]


SHELL_ENTITY_HINTS: tuple[str, ...] = (
    "HUF",
    "TRUST",
    "FAMILY TRUST",
    "PRIVATE TRUST",
    "INVESTMENT TRUST",
    "NOMINEE",
    "CUSTODIAN",
    "CLEARING MEMBER",
    "PROPRIETORSHIP",
    "PARTNERSHIP",
)

KNOWN_ENTITY_PATTERNS: tuple[EntityPattern, ...] = (
    EntityPattern("Vanguard Group", "FII", re.compile(r"VANGUARD", re.I)),
    EntityPattern("BlackRock", "FII", re.compile(r"BLACKROCK", re.I)),
    EntityPattern("Morgan Stanley", "FII", re.compile(r"MORGAN\s+STANLEY", re.I)),
    EntityPattern("Goldman Sachs", "FII", re.compile(r"GOLDMAN", re.I)),
    EntityPattern("Citigroup", "FII", re.compile(r"CITI(GROUP)?", re.I)),
    EntityPattern("JP Morgan", "FII", re.compile(r"J\.?\s*P\.?\s*MORGAN", re.I)),
    EntityPattern("HSBC", "FII", re.compile(r"HSBC", re.I)),
    EntityPattern("Deutsche Bank", "FII", re.compile(r"DEUTSCHE", re.I)),
    EntityPattern("BNP Paribas", "FII", re.compile(r"BNP", re.I)),
    EntityPattern("Fidelity", "FII", re.compile(r"FIDELITY", re.I)),
    EntityPattern("Life Insurance Corporation (LIC)", "DII", re.compile(r"LIFE\s+INSURANCE|LIC\s+OF\s+INDIA|\bLIC\b", re.I)),
    EntityPattern("SBI Mutual Fund", "MF", re.compile(r"SBI\s+(MUTUAL|MF|FUNDS)", re.I)),
    EntityPattern("ICICI Prudential AMC", "MF", re.compile(r"ICICI\s+PRUDENTIAL", re.I)),
    EntityPattern("HDFC Asset Management", "MF", re.compile(r"HDFC\s+(ASSET|MUTUAL|MF)", re.I)),
    EntityPattern("Nippon India Mutual Fund", "MF", re.compile(r"NIPPON", re.I)),
    EntityPattern("DSP Mutual Fund", "MF", re.compile(r"\bDSP\b", re.I)),
    EntityPattern("Kotak Mutual Fund", "MF", re.compile(r"KOTAK\s+(MUTUAL|MF)", re.I)),
    EntityPattern("Axis Mutual Fund", "MF", re.compile(r"AXIS\s+(MUTUAL|MF|ASSET)", re.I)),
    EntityPattern("Mirae Asset", "MF", re.compile(r"MIRAE", re.I)),
    EntityPattern("UTI Mutual Fund", "MF", re.compile(r"UTI\s+(MUTUAL|MF|ASSET)", re.I)),
    EntityPattern("Quant Mutual Fund", "MF", re.compile(r"QUANT\s+(MUTUAL|MF)", re.I)),
    EntityPattern("SBI Life Insurance", "Insurer", re.compile(r"SBI\s+LIFE", re.I)),
    EntityPattern("HDFC Life Insurance", "Insurer", re.compile(r"HDFC\s+LIFE", re.I)),
    EntityPattern("ICICI Lombard / ICICI Group", "Insurer", re.compile(r"ICICI\s+(LOMBARD|SECURITIES)", re.I)),
)


def match_known_entity(client_name: str) -> tuple[str, str] | None:
    for entry in KNOWN_ENTITY_PATTERNS:
        if entry.pattern.search(client_name):
            return entry.parent, entry.category
    return None


def is_shell_like_entity(client_name: str) -> bool:
    upper = client_name.upper()
    if any(hint in upper for hint in SHELL_ENTITY_HINTS):
        return True
    # Person-name style entities often have initials and commas.
    if re.search(r"\b[A-Z]\.\s*[A-Z]\.", client_name):
        return True
    return False
