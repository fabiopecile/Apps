import { NextRequest, NextResponse } from "next/server";
import { listBookings } from "@/data/bookings";
import { getSession } from "@/lib/session";
import { addDays, dateKey, endOfMonth, formatGermanDate, parseDateKey, startOfMonth, startOfWeek } from "@/lib/dates";

function csvEscape(value: string) {
  if (/[",;\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const periode = params.get("periode") === "monat" ? "monat" : "woche";
  const datumParam = params.get("datum");
  const anchor = datumParam && /^\d{4}-\d{2}-\d{2}$/.test(datumParam) ? parseDateKey(datumParam) : new Date();
  const locationId = params.get("standort") || undefined;
  const teamId = params.get("team") || undefined;

  const rangeStart = periode === "woche" ? startOfWeek(anchor) : startOfMonth(anchor);
  const rangeEnd = periode === "woche" ? addDays(rangeStart, 6) : endOfMonth(anchor);

  const bookings = await listBookings({ from: dateKey(rangeStart), to: dateKey(rangeEnd), locationId, teamId });

  const header = ["Datum", "Wochentag", "Art", "Standort", "Feld", "Mannschaft", "Beginn", "Ende", "Mehrfachbelegung", "Bemerkung"];
  const weekdayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const rows = bookings.map((b) => [
    formatGermanDate(b.date),
    weekdayNames[b.weekday],
    b.type === "SPIEL" ? "Spiel" : "Training",
    b.field.locationName,
    b.field.name,
    b.team.name,
    b.startTime,
    b.endTime,
    b.field.allowMultiple ? "Ja" : "Nein",
    b.note ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n");
  const bom = "﻿"; // Für korrekte Umlaute beim Öffnen in Excel

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trainingsplan_${dateKey(rangeStart)}_${dateKey(rangeEnd)}.csv"`,
    },
  });
}
