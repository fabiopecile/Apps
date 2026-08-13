"""Generiert Instagram-taugliche Quadrat-Grafiken (1080x1080) aus Match-,
News- und Transfer-Daten mit Pillow. Kein Netzwerkzugriff, keine externen
Assets noetig - Teamfarben und Kuerzel werden als Platzhalter fuer echte
Logos gezeichnet. Verlaeufe, Glow-Flecken und Pills sorgen fuer einen
moderneren Look als flache Ein-Farben-Flaechen.
"""

import textwrap
from pathlib import Path

from PIL import Image, ImageDraw

from . import canvas, theme
from .models import Match, MatchStatus, NewsItem, TeamStanding, Transfer

SIZE = 1080


def _badge(base: Image.Image, center: tuple[int, int], radius: int,
           short_name: str, color: str, ring: str) -> Image.Image:
    box = (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius)
    base = canvas.shadow_ellipse(base, box, alpha=120, blur=34, offset=(0, 20))
    draw = ImageDraw.Draw(base)
    draw.ellipse(box, fill=color, outline=ring, width=6)
    fnt = canvas.font("DejaVuSans-Bold.ttf", int(radius * 0.68))
    canvas.center_text(draw, center[0], center[1] - radius * 0.42, short_name, fnt, ring)
    return base


def _base_image(th: theme.Theme, glow_points: list[tuple[tuple[int, int], int, str, int]]) -> Image.Image:
    img = canvas.diagonal_gradient((SIZE, SIZE), th.grad_a, th.grad_b).convert("RGBA")
    for center, radius, color, alpha in glow_points:
        img = canvas.add_glow(img, center, radius, color, alpha=alpha)
    return img


def render_match_card(match: Match, out_path: Path) -> Path:
    th = theme.MATCH
    img = _base_image(th, [
        ((140, 120), 420, match.home.color, 70),
        ((SIZE - 140, 950), 420, match.away.color, 70),
        ((SIZE // 2, SIZE // 2), 520, th.accent, 30),
    ])
    draw = ImageDraw.Draw(img)

    pill_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    canvas.pill(draw, SIZE // 2, 64, match.league.upper(), pill_font, th.pill_fg, th.accent)

    day_font = canvas.font("DejaVuSans.ttf", 30)
    canvas.center_text(draw, SIZE // 2, 150, f"Spieltag {match.matchday}", day_font, th.text_muted)

    label_font = canvas.font("DejaVuSans-Bold.ttf", 24)
    canvas.center_text(draw, SIZE // 2, 210, "ENDSTAND", label_font, th.accent)

    score_font = canvas.font("DejaVuSans-Bold.ttf", 168)
    score_text = f"{match.home_score}  :  {match.away_score}"
    canvas.center_text(draw, SIZE // 2, 250, score_text, score_font, th.text_main)

    badge_y = 660
    radius = 130
    img = _badge(img, (300, badge_y), radius, match.home.short_name, match.home.color, th.text_main)
    img = _badge(img, (SIZE - 300, badge_y), radius, match.away.short_name, match.away.color, th.text_main)
    draw = ImageDraw.Draw(img)

    name_font = canvas.font("DejaVuSans-Bold.ttf", 34)
    canvas.center_text(draw, 300, badge_y + radius + 26, match.home.name, name_font, th.text_main)
    canvas.center_text(draw, SIZE - 300, badge_y + radius + 26, match.away.name, name_font, th.text_main)

    footer_font = canvas.font("DejaVuSans.ttf", 26)
    footer = match.kickoff.strftime("%d.%m.%Y")
    if match.venue:
        footer += f"   ·   {match.venue}"
    canvas.pill(draw, SIZE // 2, SIZE - 100, footer, footer_font, th.text_main, "#2A3444")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG")
    return out_path


def render_news_card(item: NewsItem, out_path: Path) -> Path:
    th = theme.NEWS
    img = _base_image(th, [
        ((SIZE - 80, 60), 480, th.accent, 55),
        ((60, SIZE - 60), 400, "#7A2FBF", 45),
    ])
    draw = ImageDraw.Draw(img)

    tag_font = canvas.font("DejaVuSans-Bold.ttf", 28)
    tag_h = canvas.pill(draw, 60 + canvas.text_size(draw, item.category.upper(), tag_font)[0] / 2 + 26,
                         70, item.category.upper(), tag_font, th.pill_fg, th.accent)

    league_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    draw.text((60, 70 + tag_h + 18), item.league, font=league_font, fill=th.text_muted)

    headline_font = canvas.font("DejaVuSans-Bold.ttf", 68)
    wrapped_headline = textwrap.wrap(item.headline, width=16)
    y = 330
    for line in wrapped_headline:
        draw.text((60, y), line, font=headline_font, fill=th.text_main)
        y += 80

    draw.line((60, y + 20, 200, y + 20), fill=th.accent, width=6)

    body_font = canvas.font("DejaVuSans.ttf", 34)
    wrapped_body = textwrap.wrap(item.body, width=40)
    y += 60
    for line in wrapped_body:
        draw.text((60, y), line, font=body_font, fill=th.text_muted)
        y += 48

    footer_font = canvas.font("DejaVuSans.ttf", 26)
    draw.text((60, SIZE - 70), item.published.strftime("%d.%m.%Y"), font=footer_font, fill=th.text_muted)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG")
    return out_path


def render_status_card(match: Match, out_path: Path) -> Path:
    """Fuer abgesagte oder abgebrochene Spiele - wird bewusst genauso
    zuverlaessig gepostet wie ein normales Ergebnis, nur mit eigenem
    Warn-Design statt Endstand.
    """
    th = theme.ALERT
    img = _base_image(th, [
        ((SIZE // 2, SIZE // 2), 560, th.accent, 32),
    ])
    draw = ImageDraw.Draw(img)

    label = "SPIEL ABGESAGT" if match.status == MatchStatus.CANCELLED else "SPIEL ABGEBROCHEN"
    pill_font = canvas.font("DejaVuSans-Bold.ttf", 32)
    canvas.pill(draw, SIZE // 2, 70, label, pill_font, th.pill_fg, th.accent)

    league_font = canvas.font("DejaVuSans.ttf", 28)
    canvas.center_text(draw, SIZE // 2, 158, match.league, league_font, th.text_muted)
    day_font = canvas.font("DejaVuSans.ttf", 26)
    canvas.center_text(draw, SIZE // 2, 196, f"Spieltag {match.matchday}", day_font, th.text_muted)

    badge_y = 470
    radius = 130
    img = _badge(img, (300, badge_y), radius, match.home.short_name, match.home.color, th.text_main)
    img = _badge(img, (SIZE - 300, badge_y), radius, match.away.short_name, match.away.color, th.text_main)
    draw = ImageDraw.Draw(img)

    vs_font = canvas.font("DejaVuSans-Bold.ttf", 46)
    canvas.center_text(draw, SIZE // 2, badge_y - 26, "VS", vs_font, th.accent)

    name_font = canvas.font("DejaVuSans-Bold.ttf", 34)
    canvas.center_text(draw, 300, badge_y + radius + 26, match.home.name, name_font, th.text_main)
    canvas.center_text(draw, SIZE - 300, badge_y + radius + 26, match.away.name, name_font, th.text_main)

    y = badge_y + radius + 100
    if match.status == MatchStatus.ABANDONED and match.home_score is not None:
        score_font = canvas.font("DejaVuSans-Bold.ttf", 28)
        canvas.center_text(
            draw, SIZE // 2, y,
            f"Stand bei Abbruch: {match.home_score}:{match.away_score}",
            score_font, th.text_main,
        )
        y += 46

    if match.note:
        body_font = canvas.font("DejaVuSans.ttf", 28)
        y += 14
        for line in textwrap.wrap(match.note, width=40):
            canvas.center_text(draw, SIZE // 2, y, line, body_font, th.text_muted)
            y += 40

    footer_font = canvas.font("DejaVuSans.ttf", 26)
    footer = match.kickoff.strftime("%d.%m.%Y")
    if match.venue:
        footer += f"   ·   {match.venue}"
    canvas.pill(draw, SIZE // 2, SIZE - 100, footer, footer_font, th.text_main, "#3A1D1D")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG")
    return out_path


def render_table_card(standings: list[TeamStanding], league: str, matchday: int, out_path: Path) -> Path:
    th = theme.TABLE
    img = _base_image(th, [
        ((SIZE // 2, -40), 560, th.accent, 28),
    ])
    draw = ImageDraw.Draw(img)

    pill_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    canvas.pill(draw, SIZE // 2, 56, league.upper(), pill_font, th.pill_fg, th.accent)

    title_font = canvas.font("DejaVuSans-Bold.ttf", 38)
    canvas.center_text(draw, SIZE // 2, 138, f"Tabelle nach Spieltag {matchday}", title_font, th.text_main)

    col_rank, col_name, col_sp, col_diff, col_pkt = 70, 210, 760, 870, 985
    header_font = canvas.font("DejaVuSans-Bold.ttf", 22)
    header_y = 224
    draw.text((col_name, header_y), "TEAM", font=header_font, fill=th.text_muted)
    draw.text((col_sp, header_y), "SP", font=header_font, fill=th.text_muted)
    draw.text((col_diff, header_y), "DIFF", font=header_font, fill=th.text_muted)
    draw.text((col_pkt, header_y), "PKT", font=header_font, fill=th.text_muted)

    row_h = 90
    y0 = 264
    name_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    rank_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    value_font = canvas.font("DejaVuSans.ttf", 26)
    badge_font = canvas.font("DejaVuSans-Bold.ttf", 18)

    for i, row in enumerate(standings):
        ry = y0 + i * row_h
        if i % 2 == 0:
            img = canvas.translucent_rounded_rect(img, (40, ry, SIZE - 40, ry + row_h - 10), "#FFFFFF", alpha=14)
            draw = ImageDraw.Draw(img)

        canvas.center_text(draw, col_rank, ry + 22, str(row.position), rank_font, th.accent)

        badge_r = 26
        badge_cx, badge_cy = 150, ry + row_h // 2 - 5
        draw.ellipse(
            (badge_cx - badge_r, badge_cy - badge_r, badge_cx + badge_r, badge_cy + badge_r),
            fill=row.team.color, outline=th.text_main, width=2,
        )
        canvas.center_text(draw, badge_cx, badge_cy - 12, row.team.short_name, badge_font, th.text_main)

        draw.text((col_name, ry + 20), row.team.name, font=name_font, fill=th.text_main)
        draw.text((col_sp, ry + 24), str(row.played), font=value_font, fill=th.text_muted)
        diff = row.goal_diff
        draw.text((col_diff, ry + 24), f"{'+' if diff > 0 else ''}{diff}", font=value_font, fill=th.text_muted)
        draw.text((col_pkt, ry + 20), str(row.points), font=name_font, fill=th.accent)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG")
    return out_path


def render_transfer_card(transfer: Transfer, out_path: Path) -> Path:
    th = theme.TRANSFER
    img = _base_image(th, [
        ((SIZE // 2, -60), 560, th.accent, 40),
        ((SIZE // 2, SIZE + 80), 520, "#3D2C7A", 60),
    ])
    draw = ImageDraw.Draw(img)

    tag_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    canvas.pill(draw, SIZE // 2, 60, "TRANSFER", tag_font, th.pill_fg, th.accent)

    league_font = canvas.font("DejaVuSans.ttf", 28)
    canvas.center_text(draw, SIZE // 2, 148, transfer.league, league_font, th.text_muted)

    name_font = canvas.font("DejaVuSans-Bold.ttf", 62)
    wrapped_name = textwrap.wrap(transfer.player_name, width=16)
    y = 220
    for line in wrapped_name:
        canvas.center_text(draw, SIZE // 2, y, line, name_font, th.text_main)
        y += 74

    pos_font = canvas.font("DejaVuSans.ttf", 30)
    canvas.center_text(draw, SIZE // 2, y + 6, transfer.position, pos_font, th.accent)

    badge_y = 620
    radius = 120
    gap = 210
    img = _badge(img, (SIZE // 2 - gap, badge_y), radius, transfer.from_club.short_name,
                 transfer.from_club.color, th.text_main)
    img = _badge(img, (SIZE // 2 + gap, badge_y), radius, transfer.to_club.short_name,
                 transfer.to_club.color, th.text_main)
    draw = ImageDraw.Draw(img)

    arrow_font = canvas.font("DejaVuSans-Bold.ttf", 60)
    canvas.center_text(draw, SIZE // 2, badge_y - 34, "→", arrow_font, th.accent)

    club_font = canvas.font("DejaVuSans-Bold.ttf", 30)
    canvas.center_text(draw, SIZE // 2 - gap, badge_y + radius + 24, transfer.from_club.name, club_font, th.text_main)
    canvas.center_text(draw, SIZE // 2 + gap, badge_y + radius + 24, transfer.to_club.name, club_font, th.text_main)

    detail = transfer.transfer_type
    if transfer.fee:
        detail += f"   ·   {transfer.fee}"
    detail_font = canvas.font("DejaVuSans.ttf", 28)
    canvas.pill(draw, SIZE // 2, SIZE - 130, detail, detail_font, th.pill_fg, th.accent)

    date_font = canvas.font("DejaVuSans.ttf", 24)
    canvas.center_text(draw, SIZE // 2, SIZE - 56, transfer.date.strftime("%d.%m.%Y"), date_font, th.text_muted)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG")
    return out_path
