"""Erzeugt Instagram-Captions (Text + Hashtags) passend zu einer Grafik.
Getrennt von der Bildgenerierung, weil die Caption spaeter direkt beim
Upload (Graph API) mitgegeben wird und nicht ins Bild gehoert.
"""

from .models import Match, NewsItem


def caption_for_match(match: Match) -> str:
    result = "Sieg" if match.home_score != match.away_score else "Unentschieden"
    lines = [
        f"⚽ {match.home.name} {match.home_score}:{match.away_score} {match.away.name}",
        f"Spieltag {match.matchday} | {match.league}",
        "",
        f"{result} in {match.venue}!" if match.venue else f"{result}!",
        "",
        f"#{match.league.replace(' ', '')} #Fussball #Ergebnis "
        f"#{match.home.short_name} #{match.away.short_name}",
    ]
    return "\n".join(lines)


def caption_for_news(item: NewsItem) -> str:
    lines = [
        f"📰 {item.headline}",
        "",
        item.body,
        "",
        f"#{item.league.replace(' ', '')} #Fussball #{item.category.replace(' ', '')}",
    ]
    return "\n".join(lines)
