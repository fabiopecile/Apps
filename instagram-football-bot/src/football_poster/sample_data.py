"""Beispiel-/Mock-Daten.

Hier werden aktuell feste Beispieldaten zurueckgegeben. Sobald eine echte
Datenquelle angebunden wird (siehe README, Abschnitt "Naechste Schritte"),
ersetzt eine Funktion mit derselben Signatur (-> list[Match] / list[NewsItem])
einfach diese Mock-Implementierung - der Rest der App bleibt unveraendert.
"""

from datetime import datetime

from .models import Match, MatchStatus, NewsItem, Team, Transfer

LEAGUE_NAME = "Kreisliga A"

_FALKEN = Team(name="SV Falken", short_name="FAL", color="#1E5B3A")
_ADLER = Team(name="FC Adler", short_name="ADL", color="#B3251E")
_WANDERER = Team(name="TuS Wanderer", short_name="WAN", color="#1F4E8C")
_TITANEN = Team(name="SC Titanen", short_name="TIT", color="#8C6E1F")
_KOMETEN = Team(name="VfL Kometen", short_name="KOM", color="#7A4B1E")


def get_matches() -> list[Match]:
    return [
        # Spieltag 11 - regulaer beendet
        Match(
            league=LEAGUE_NAME,
            matchday=11,
            home=_FALKEN,
            away=_WANDERER,
            status=MatchStatus.FINISHED,
            home_score=2,
            away_score=0,
            kickoff=datetime(2026, 8, 5, 15, 30),
            venue="Waldstadion",
        ),
        Match(
            league=LEAGUE_NAME,
            matchday=11,
            home=_ADLER,
            away=_TITANEN,
            status=MatchStatus.FINISHED,
            home_score=1,
            away_score=1,
            kickoff=datetime(2026, 8, 5, 15, 30),
            venue="Adler-Arena",
        ),
        # Spieltag 12 - ein Spiel wird nach Anpfiff abgebrochen
        Match(
            league=LEAGUE_NAME,
            matchday=12,
            home=_FALKEN,
            away=_ADLER,
            status=MatchStatus.FINISHED,
            home_score=3,
            away_score=1,
            kickoff=datetime(2026, 8, 12, 15, 30),
            venue="Waldstadion",
        ),
        Match(
            league=LEAGUE_NAME,
            matchday=12,
            home=_WANDERER,
            away=_TITANEN,
            status=MatchStatus.ABANDONED,
            home_score=1,
            away_score=1,
            kickoff=datetime(2026, 8, 12, 18, 0),
            venue="Am Sportplatz",
            note="Nach einem Unwetter in der 63. Minute abgebrochen. "
                 "Die Wertung entscheidet der Staffelleiter.",
        ),
        # Spieltag 13 - ein Spiel wird vorher abgesagt
        Match(
            league=LEAGUE_NAME,
            matchday=13,
            home=_ADLER,
            away=_WANDERER,
            status=MatchStatus.CANCELLED,
            kickoff=datetime(2026, 8, 19, 15, 30),
            venue="Adler-Arena",
            note="Wegen Platzsperre kurzfristig abgesagt. Nachholtermin folgt.",
        ),
        Match(
            league=LEAGUE_NAME,
            matchday=13,
            home=_FALKEN,
            away=_TITANEN,
            status=MatchStatus.FINISHED,
            home_score=2,
            away_score=2,
            kickoff=datetime(2026, 8, 19, 15, 30),
            venue="Waldstadion",
        ),
    ]


def get_news() -> list[NewsItem]:
    return [
        NewsItem(
            league=LEAGUE_NAME,
            headline="SV Falken siegt souverän im Topspiel",
            body=(
                "Mit einem klaren 3:1 gegen den FC Adler setzt sich der "
                "SV Falken an die Tabellenspitze der " + LEAGUE_NAME + "."
            ),
            category="Spielbericht",
        ),
        NewsItem(
            league=LEAGUE_NAME,
            headline="Nachtrag: Spieltag 14 wird verlegt",
            body=(
                "Aufgrund der Platzsperre am Sportplatz wird die Partie "
                "TuS Wanderer gegen SC Titanen auf den 20. September verlegt."
            ),
            category="Verbandsmitteilung",
        ),
    ]


def get_transfers() -> list[Transfer]:
    return [
        Transfer(
            league=LEAGUE_NAME,
            player_name="Jonas Meier",
            position="Mittelfeld",
            from_club=_WANDERER,
            to_club=_FALKEN,
            transfer_type="Ablöse",
            fee="15.000 €",
            date=datetime(2026, 8, 13),
        ),
        Transfer(
            league=LEAGUE_NAME,
            player_name="Elias Brunner",
            position="Sturm",
            from_club=_KOMETEN,
            to_club=_TITANEN,
            transfer_type="Leihe",
            fee="",
            date=datetime(2026, 8, 13),
        ),
    ]
