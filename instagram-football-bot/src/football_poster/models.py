from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


@dataclass
class Team:
    name: str
    short_name: str
    color: str  # hex color used for the team's accent circle


class MatchStatus(str, Enum):
    SCHEDULED = "scheduled"
    FINISHED = "finished"
    CANCELLED = "cancelled"  # abgesagt - fand nicht statt
    ABANDONED = "abandoned"  # abgebrochen - wurde angepfiffen, dann gestoppt


@dataclass
class Match:
    league: str
    matchday: int
    home: Team
    away: Team
    kickoff: datetime
    status: MatchStatus = MatchStatus.FINISHED
    home_score: int | None = None
    away_score: int | None = None
    venue: str = ""
    note: str = ""  # z.B. Grund fuer Absage/Abbruch


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


@dataclass
class TeamStanding:
    position: int
    team: Team
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    points: int

    @property
    def goal_diff(self) -> int:
        return self.goals_for - self.goals_against
