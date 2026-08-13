from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Team:
    name: str
    short_name: str
    color: str  # hex color used for the team's accent circle


@dataclass
class Match:
    league: str
    matchday: int
    home: Team
    away: Team
    home_score: int
    away_score: int
    kickoff: datetime
    venue: str = ""


@dataclass
class NewsItem:
    league: str
    headline: str
    body: str
    category: str = "News"
    published: datetime = field(default_factory=datetime.now)


@dataclass
class Transfer:
    league: str
    player_name: str
    position: str
    from_club: Team
    to_club: Team
    transfer_type: str = "Ablöse"  # z.B. "Ablöse", "Leihe", "ablösefrei"
    fee: str = ""  # z.B. "50.000 €", leer wenn nicht kommuniziert
    date: datetime = field(default_factory=datetime.now)
