"""Erzeugt Instagram-Captions (Text + Hashtags) passend zu einer Grafik.
Getrennt von der Bildgenerierung, weil die Caption spaeter direkt beim
Upload (Graph API) mitgegeben wird und nicht ins Bild gehoert.
"""

from .models import Match, NewsItem, Transfer


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


def caption_for_transfer(transfer: Transfer) -> str:
    fee_line = f" ({transfer.fee})" if transfer.fee else ""
    lines = [
        f"🔄 {transfer.player_name} wechselt zu {transfer.to_club.name}!",
        f"{transfer.position} | {transfer.from_club.name} ➜ {transfer.to_club.name}",
        f"{transfer.transfer_type}{fee_line}",
        "",
        f"#{transfer.league.replace(' ', '')} #Transfer #Fussball "
        f"#{transfer.from_club.short_name} #{transfer.to_club.short_name}",
    ]
    return "\n".join(lines)
