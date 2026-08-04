# ProCareer – Fußball Karriere Simulator

Ein browser- und mobilfreundliches Fußball-Karriere-Simulationsspiel. Erstelle
einen eigenen Profi und begleite ihn von der Jugend bis zum Karriereende:
Saisons mit Liga, Pokal und Königsklasse, interaktive Trainings-Minispiele,
ein Persönlichkeitssystem, Presse- und Social-Media-Reaktionen, Transfers mit
Verhandlungen, Sponsoren, Investitionen, Verletzungen, Nationalmannschaft,
Ballon d'Or-Gala, Zufallsereignisse, Karriere-Meilensteine und ein
Retrospektiv am Karriereende.

## Tech-Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (mit `localStorage`-Persistenz für Spielstände)
- Framer Motion für Animationen

## Projektstruktur

```
src/
  types/       Zentrale Domänentypen (Player, Club, Match, ...)
  data/        Statische Spieldaten (Vereine, Ligen, Nationen, Namen, Sponsoren, Lifestyle)
  engine/      Reine Simulationslogik (Match-Engine, Training, Transfers, Presse,
               Marktwert, Verletzungen, Nationalmannschaft, Saisonablauf, Ballon d'Or, ...)
  store/       Zustand-Store, der die Engine mit UI-Aktionen verbindet
  screens/     Bildschirme (Erstellung, Hub, Match, Training, Presse, Transfers, ...)
  components/  Wiederverwendbare UI-Bausteine
```

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build     # Typecheck + Produktionsbuild
```

Spielstände werden automatisch im Browser (`localStorage`) gespeichert.
