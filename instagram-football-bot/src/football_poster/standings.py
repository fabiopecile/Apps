"""Berechnet die Tabelle aus einer Liste von Matches und erkennt, ob ein
Spieltag komplett entschieden ist (jedes Spiel ausgetragen, abgesagt oder
abgebrochen - egal was, Hauptsache es steht ein Ergebnis/Status fest).
"""

from .models import Match, MatchStatus, TeamStanding


def matchday_is_decided(matches: list[Match]) -> bool:
    """True, wenn kein Spiel des Spieltags mehr offen (SCHEDULED) ist.
    Abgesagte und abgebrochene Spiele zaehlen als entschieden - fuer sie
    wird trotzdem gepostet, nur eben keine Ergebnis-, sondern eine
    Status-Grafik (siehe generator.render_status_card).
    """
    return all(m.status != MatchStatus.SCHEDULED for m in matches)


def compute_standings(matches: list[Match]) -> list[TeamStanding]:
    """Tabelle aus allen tatsaechlich gewerteten (FINISHED) Spielen.
    Abgesagte und abgebrochene Spiele fliessen nicht ein, bis sie
    nachgeholt bzw. gewertet wurden.
    """
    teams = {}
    stats: dict[str, dict[str, int]] = {}

    for m in matches:
        if m.status != MatchStatus.FINISHED:
            continue
        for team in (m.home, m.away):
            teams[team.short_name] = team
            stats.setdefault(team.short_name, dict(
                played=0, wins=0, draws=0, losses=0, gf=0, ga=0, pts=0,
            ))

        home, away = stats[m.home.short_name], stats[m.away.short_name]
        home["played"] += 1
        away["played"] += 1
        home["gf"] += m.home_score
        home["ga"] += m.away_score
        away["gf"] += m.away_score
        away["ga"] += m.home_score

        if m.home_score > m.away_score:
            home["wins"] += 1
            home["pts"] += 3
            away["losses"] += 1
        elif m.home_score < m.away_score:
            away["wins"] += 1
            away["pts"] += 3
            home["losses"] += 1
        else:
            home["draws"] += 1
            away["draws"] += 1
            home["pts"] += 1
            away["pts"] += 1

    ranked = sorted(
        stats.items(),
        key=lambda kv: (-kv[1]["pts"], -(kv[1]["gf"] - kv[1]["ga"]), -kv[1]["gf"], teams[kv[0]].name),
    )

    return [
        TeamStanding(
            position=i,
            team=teams[short_name],
            played=s["played"],
            wins=s["wins"],
            draws=s["draws"],
            losses=s["losses"],
            goals_for=s["gf"],
            goals_against=s["ga"],
            points=s["pts"],
        )
        for i, (short_name, s) in enumerate(ranked, start=1)
    ]
