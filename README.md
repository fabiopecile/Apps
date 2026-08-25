# Nachwuchsplaner

Web-App zur Jahresplanung der Nachwuchs-Mannschaften: Trainingszeiten, Mannschaften und die Belegung der
Trainingsstandorte zentral in einem Jahreskalender verwalten.

## Funktionsumfang

- **Jahreskalender** mit Monats-, Wochen- und Tagesansicht (Tagesansicht als Standort/Feld-Belegungsraster),
  Jahres-/Datumsnavigation, Filter nach Standort, Mannschaft und Volltextsuche.
- **Standorte & Felder**: Bewegung (Hauptfeld, Nebenfeld), Tabor, Gleink, Stadion, Kunstrasen, Fitnessstudio –
  gruppiert, beliebig erweiterbar unter „Standorte“.
- **Mehrfachbelegung**: Felder können so konfiguriert werden, dass mehrere Mannschaften gleichzeitig trainieren
  dürfen. Andernfalls prüft das System automatisch auf Zeitüberschneidungen (clientseitig live und serverseitig
  verbindlich) und blockiert bzw. warnt vor Konflikten.
- **Konfliktübersicht** unter „Konflikte“.
- **Mannschaftsverwaltung** inkl. Altersklasse, Trainer, Trainingsgruppe und Kalenderfarbe.
- **Rollenbasierte Zugriffskontrolle**: Administrator (voller Zugriff inkl. Benutzerverwaltung), Bearbeiter
  (Kalender/Mannschaften/Standorte bearbeiten), Leser (nur Ansicht). Rechte werden serverseitig in der
  Data-Access-Layer (`src/data/*`) erzwungen, nicht nur in der Oberfläche.
- **Jahresplanung im Voraus** inkl. „Training wiederholen“ (wiederkehrende Serie über Wochentag + Zeitraum) mit
  Vorschau der erzeugten Termine vor dem Speichern.
- **Zusatzfunktionen**: Eintrag kopieren, Trainingstag duplizieren, auf anderes Feld verschieben,
  Änderungsverlauf/Ersteller je Eintrag, Löschbestätigung, automatische Entwurfsspeicherung im Browser,
  Druckansicht (Wochen-/Monatsübersicht, PDF über den Browser-Druckdialog) und CSV-/Excel-Export.
- Vollständig responsive (Smartphone, Tablet, Desktop).

## Tech-Stack

- **Next.js 16** (App Router, Server Actions, Server-seitige Validierung)
- **TypeScript**, **Tailwind CSS v4**
- **Prisma 6** mit **PostgreSQL** (z. B. Supabase) als persistente Datenbank
- Eigene Session-/Auth-Schicht (httpOnly-JWT-Cookie via `jose`, Passwort-Hashing via `bcryptjs`) – kein externer
  Auth-Anbieter nötig
- `zod` für serverseitige Eingabevalidierung

## Erste Schritte (lokal)

Voraussetzung: eine erreichbare PostgreSQL-Datenbank, z. B. ein kostenloses [Supabase](https://supabase.com)-Projekt.

```bash
npm install
cp .env.example .env      # DATABASE_URL/DIRECT_URL (Supabase) + eigenes SESSION_SECRET eintragen
npm run db:setup          # Migrationen anwenden + Beispieldaten einspielen
npm run dev
```

Anschließend [http://localhost:3000](http://localhost:3000) öffnen.

## Deployment auf Netlify + Supabase

1. **Supabase-Projekt anlegen** (oder ein bestehendes verwenden) → *Project Settings → Database → Connect* →
   Connection strings kopieren:
   - „Transaction pooler" (Port 6543, mit `?pgbouncer=true`) → wird zu `DATABASE_URL`
   - „Direct connection" (Port 5432) → wird zu `DIRECT_URL`
2. **Netlify-Site anlegen**: *Add new site → Import an existing project* → dieses GitHub-Repo
   (`fabiopecile/Apps`) und den gewünschten Branch auswählen. Build-Command und Next.js-Plugin sind bereits über
   `netlify.toml` konfiguriert.
3. **Umgebungsvariablen** in Netlify unter *Site configuration → Environment variables* setzen:
   `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (langer zufälliger String).
4. **Deploy anstoßen.** Der Build führt automatisch `prisma migrate deploy` aus und legt damit das Datenbankschema
   in Supabase an.
5. **Einmalig Beispieldaten einspielen** (Standorte, Mannschaften, Demo-Benutzer): lokal `.env` auf die
   Supabase-Verbindung setzen und `npm run db:seed` ausführen. Das passiert bewusst **nicht** automatisch bei
   jedem Deploy, damit nicht bei jedem Build erneut Demo-Zugänge mit Standardpasswörtern angelegt werden.
   ⚠️ Für mehr als eine private Testumgebung: Passwörter der Demo-Benutzer nach dem ersten Login unter
   „Benutzer" ändern (oder gleich eigene Benutzer anlegen und die Demo-Accounts löschen).

### Demo-Zugänge (aus dem Seed-Skript)

| Rolle         | E-Mail                  | Passwort   |
| ------------- | ------------------------ | ---------- |
| Administrator | admin@verein.local       | admin123   |
| Bearbeiter    | trainer@verein.local     | trainer123 |
| Leser         | leser@verein.local       | leser123   |

## Nützliche Skripte

- `npm run dev` – Entwicklungsserver
- `npm run build` / `npm run start` – Produktions-Build/-Start
- `npm run db:migrate` – neue Migration erstellen (Entwicklung)
- `npm run db:deploy` – Migrationen anwenden (Produktion)
- `npm run db:seed` – Beispieldaten erneut einspielen
- `npm run lint` – ESLint

## Projektstruktur

```
prisma/               Schema, Migrationen, Seed-Skript
src/app/               Next.js-Routen (App Router)
  (app)/                Geschützter Bereich inkl. Navigation (Dashboard, Kalender, Konflikte, …)
  login/                 Anmeldeseite
  api/export/csv/         CSV-/Excel-Export
src/actions/           "use server"-Einstiegspunkte (dünne Wrapper um die Data-Access-Layer)
src/data/               Data-Access-Layer: Berechtigungsprüfung, Validierung, Datenbankzugriff
src/components/        UI-Komponenten (Kalender, Buchungsformular, Verwaltung, Druckansicht, UI-Kit)
src/lib/                 Session/Auth, Datum-/Zeit-Hilfsfunktionen, Konfliktlogik, Validierungsschemata
```

## Hinweis zur Datenbank

`DATABASE_URL` sollte die **gepoolte** Supabase-Verbindung (Port 6543, `pgbouncer=true`) sein – die Next.js-App
läuft in kurzlebigen Serverless-/Edge-Funktionen und würde mit einer direkten Verbindung schnell das
Connection-Limit von Postgres ausschöpfen. `DIRECT_URL` (Port 5432) wird ausschließlich von `prisma migrate`
für Schemaänderungen verwendet.
