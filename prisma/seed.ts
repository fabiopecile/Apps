import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Montag = 0 ... Sonntag = 6
function isoWeekday(d: Date) {
  return (d.getDay() + 6) % 7;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function main() {
  console.log("Seed: Benutzer anlegen ...");
  const users = [
    { name: "Anna Admin", email: "admin@verein.local", password: "admin123", role: "ADMIN" as const },
    { name: "Tobias Trainer", email: "trainer@verein.local", password: "trainer123", role: "EDITOR" as const },
    { name: "Lena Leser", email: "leser@verein.local", password: "leser123", role: "VIEWER" as const },
  ];
  const userRecords: Record<string, { id: string; name: string }> = {};
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    userRecords[u.email] = { id: rec.id, name: rec.name };
  }
  const admin = userRecords["admin@verein.local"];

  console.log("Seed: Standorte & Felder anlegen ...");
  const locationsData = [
    {
      name: "Bewegung",
      group: "Bewegung",
      order: 0,
      fields: [
        { name: "Hauptfeld", allowMultiple: true, order: 0 },
        { name: "Nebenfeld", allowMultiple: false, order: 1 },
      ],
    },
    { name: "Tabor", group: "Weitere Plätze", order: 1, fields: [{ name: "Platz", allowMultiple: false, order: 0 }] },
    { name: "Gleink", group: "Weitere Plätze", order: 2, fields: [{ name: "Platz", allowMultiple: false, order: 0 }] },
    { name: "Stadion", group: "Weitere Plätze", order: 3, fields: [{ name: "Platz", allowMultiple: false, order: 0 }] },
    { name: "Kunstrasen", group: "Weitere Plätze", order: 4, fields: [{ name: "Platz", allowMultiple: false, order: 0 }] },
    { name: "Fitnessstudio", group: "Weitere Plätze", order: 5, fields: [{ name: "Raum", allowMultiple: true, order: 0 }] },
  ];

  const fieldIds: Record<string, string> = {}; // "Standort/Feld" -> id
  for (const loc of locationsData) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    const location = existing
      ? await prisma.location.update({ where: { id: existing.id }, data: { group: loc.group, order: loc.order } })
      : await prisma.location.create({ data: { name: loc.name, group: loc.group, order: loc.order } });

    for (const f of loc.fields) {
      const existingField = await prisma.field.findFirst({ where: { locationId: location.id, name: f.name } });
      const field = existingField
        ? await prisma.field.update({
            where: { id: existingField.id },
            data: { allowMultiple: f.allowMultiple, order: f.order },
          })
        : await prisma.field.create({
            data: { locationId: location.id, name: f.name, allowMultiple: f.allowMultiple, order: f.order },
          });
      fieldIds[`${loc.name}/${f.name}`] = field.id;
    }
  }

  console.log("Seed: Mannschaften anlegen ...");
  const teamsData = [
    { name: "U7", ageGroup: "U7", color: "#60a5fa", order: 0 },
    { name: "U8", ageGroup: "U8", color: "#3b82f6", order: 1 },
    { name: "U9", ageGroup: "U9", color: "#2563eb", order: 2 },
    { name: "U10", ageGroup: "U10", color: "#1d4ed8", order: 3 },
    { name: "U11", ageGroup: "U11", color: "#4ade80", order: 4 },
    { name: "U12", ageGroup: "U12", color: "#22c55e", order: 5 },
    { name: "U13", ageGroup: "U13", color: "#16a34a", order: 6 },
    { name: "U14", ageGroup: "U14", color: "#15803d", order: 7 },
    { name: "U15", ageGroup: "U15", color: "#fb923c", order: 8 },
    { name: "U16", ageGroup: "U16", color: "#f97316", order: 9 },
    { name: "U18", ageGroup: "U18", color: "#ea580c", order: 10 },
    { name: "Kampfmannschaft", ageGroup: "Kampfmannschaft", color: "#7c3aed", order: 11 },
  ];
  const teamIds: Record<string, string> = {};
  for (const t of teamsData) {
    const rec = await prisma.team.upsert({
      where: { name: t.name },
      update: { ageGroup: t.ageGroup, color: t.color, order: t.order },
      create: { name: t.name, ageGroup: t.ageGroup, color: t.color, order: t.order, trainingGroup: null, trainer: null },
    });
    teamIds[t.name] = rec.id;
  }

  console.log("Seed: Beispiel-Trainingszeiten anlegen ...");
  const today = new Date();
  const monday = addDays(today, -isoWeekday(today));

  type Demo = { dayOffset: number; field: string; team: string; start: string; end: string; note?: string };
  const demoBookings: Demo[] = [
    { dayOffset: 0, field: "Bewegung/Hauptfeld", team: "U15", start: "17:00", end: "18:30" },
    { dayOffset: 0, field: "Bewegung/Hauptfeld", team: "U13", start: "17:00", end: "18:30" },
    { dayOffset: 0, field: "Bewegung/Nebenfeld", team: "U10", start: "17:00", end: "18:15" },
    { dayOffset: 1, field: "Tabor/Platz", team: "U11", start: "16:30", end: "17:45" },
    { dayOffset: 1, field: "Kunstrasen/Platz", team: "U16", start: "18:00", end: "19:30" },
    { dayOffset: 2, field: "Gleink/Platz", team: "U12", start: "17:00", end: "18:15" },
    { dayOffset: 2, field: "Bewegung/Hauptfeld", team: "U18", start: "19:00", end: "20:30" },
    { dayOffset: 3, field: "Stadion/Platz", team: "Kampfmannschaft", start: "18:30", end: "20:00" },
    { dayOffset: 4, field: "Bewegung/Nebenfeld", team: "U14", start: "17:00", end: "18:15" },
    { dayOffset: 4, field: "Fitnessstudio/Raum", team: "U16", start: "18:30", end: "19:30" },
    { dayOffset: 4, field: "Fitnessstudio/Raum", team: "U18", start: "18:30", end: "19:30" },
    { dayOffset: 5, field: "Bewegung/Hauptfeld", team: "U9", start: "10:00", end: "11:00" },
  ];

  for (const b of demoBookings) {
    const date = addDays(monday, b.dayOffset);
    const dateStr = toDateString(date);
    const fieldId = fieldIds[b.field];
    const teamId = teamIds[b.team];
    const exists = await prisma.booking.findFirst({
      where: { date: dateStr, fieldId, teamId, startTime: b.start },
    });
    if (!exists) {
      await prisma.booking.create({
        data: {
          date: dateStr,
          weekday: isoWeekday(date),
          fieldId,
          teamId,
          startTime: b.start,
          endTime: b.end,
          note: b.note,
          createdById: admin.id,
          createdByName: admin.name,
        },
      });
    }
  }

  console.log("Seed abgeschlossen.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
