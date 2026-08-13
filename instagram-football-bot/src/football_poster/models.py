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
