"""Farbpaletten je Karten-Typ. Jede Karte bekommt einen eigenen Verlauf +
Akzentfarbe, damit Ergebnis-, News- und Transfer-Posts im Feed sofort
unterscheidbar sind, aber trotzdem als eine Bildsprache wirken.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Theme:
    grad_a: str
    grad_b: str
    accent: str
    text_main: str = "#F5F6FA"
    text_muted: str = "#A9B2C3"
    pill_fg: str = "#0B0D12"


MATCH = Theme(grad_a="#0B0F1A", grad_b="#123B33", accent="#26E8A6")
NEWS = Theme(grad_a="#160B12", grad_b="#3A1420", accent="#FF5C7A")
TRANSFER = Theme(grad_a="#100B1F", grad_b="#241542", accent="#FFC94A")
