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
- **Prisma 6** mit **SQLite** als persistente Datenbank (leicht auf Postgres/MySQL umstellbar)
- Eigene Session-/Auth-Schicht (httpOnly-JWT-Cookie via `jose`, Passwort-Hashing via `bcryptjs`) – kein externer
  Auth-Anbieter nötig
- `zod` für serverseitige Eingabevalidierung

## Erste Schritte

```bash
npm install
cp .env.example .env      # SESSION_SECRET in Produktion durch einen zufälligen Wert ersetzen
npm run db:setup          # Datenbank anlegen/migrieren + Beispieldaten einspielen
npm run dev
```

Anschließend [http://localhost:3000](http://localhost:3000) öffnen.

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

Standardmäßig wird eine lokale SQLite-Datei (`prisma/dev.db`) verwendet – ausreichend für einen Verein und ohne
zusätzliche Infrastruktur lauffähig. Für einen Mehrserver-Betrieb kann in `prisma/schema.prisma` der
`datasource`-Provider (z. B. auf `postgresql`) umgestellt und `DATABASE_URL` entsprechend gesetzt werden; der
restliche Code ist davon unabhängig.
