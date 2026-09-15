# Wenn du mit der App Geld verdienen willst

Diese Datei ist die Anleitung für den Tag, an dem du den Verkauf einschaltest.
Bis dahin musst du nichts davon tun: **die App ist gerade so eingestellt, dass
sie nichts verkauft**, und in dem Zustand brauchst du kein Impressum, keine
Widerrufsbelehrung und kein Gewerbe.

> **Ich bin kein Anwalt und kein Steuerberater, und das hier ist keine
> Rechtsberatung.** Die Texte in `lib/legal.ts` sind die üblichen Texte für
> einen Einzelunternehmer, der kleine digitale Freischaltungen verkauft, und sie
> beschreiben genau das, was diese App wirklich tut. Sie sind ein guter
> Ausgangspunkt — geprüft hat sie niemand.

---

## Teil 1: Wie der Schalter funktioniert

Es gibt **einen** Schalter, und er braucht **zwei** Dinge gleichzeitig. Fehlt
eins davon, bleibt der Shop zu. Das ist Absicht: so kann dir nicht passieren,
dass die App Geld nimmt, während dein Impressum noch leer ist.

| | Was | Wo |
|---|---|---|
| 1 | Deine Anbieterangaben ausfüllen | `beerpong/lib/legal.ts`, ganz oben im Block `OPERATOR` |
| 2 | Die Variable `SALES` auf `on` setzen | GitHub → Settings → Secrets and variables → Actions → **Variables** |

Danach die Web-App einmal neu veröffentlichen (Actions → „Web-App
veröffentlichen" → Run workflow).

**Ausschalten geht genauso schnell:** `SALES` löschen oder auf `off` setzen,
neu veröffentlichen. Niemand verliert dabei etwas — gekaufte Freischaltungen
bleiben gespeichert.

### Was sich ändert, wenn der Schalter aus ist

- Die **Kamera zählt ohne Wochenlimit** mit. Ein Limit, das man nur durch einen
  Kauf loswird, wäre ohne Shop eine Sackgasse.
- Die **Länder-Becher** sind nicht zu sehen. Sie sind nicht gratis, sie sind
  einfach nicht drin. (Die Coin-Designs unter Skins → Becher bleiben alle da.)
- Die App sagt auf dem Pro-Bildschirm **„Alles kostenlos"** statt einen Preis.
- Die Anleitung bekommt ein anderes Kapitel über Geld — eines, das ehrlich
  „nichts" sagt.

Beim Einschalten bekommt also niemand etwas weggenommen, nur etwas dazu.

---

## Teil 2: Deine Angaben eintragen

In `beerpong/lib/legal.ts` steht ganz oben:

```ts
export const OPERATOR: Operator = {
  name: '',          // Vor- und Nachname. Ein Fantasiename allein reicht nicht.
  street: '',        // Straße und Hausnummer. Postfach reicht nicht.
  city: '',          // '12345 Musterstadt'
  country: 'DE',     // 'DE', 'AT' oder 'CH'
  email: '',         // Muss erreichbar sein und gelesen werden.
  phone: '',         // Optional, aber empfohlen.
  vatId: '',         // Leer lassen als Kleinunternehmer.
  smallBusiness: true,
};
```

Mehr ist es nicht. Aus diesem Block bauen sich **alle vier Dokumente** zusammen,
auf Deutsch und auf Englisch:

- **Impressum** — zitiert automatisch das richtige Gesetz für dein Land
  (Deutschland § 5 DDG, Österreich § 5 ECG, Schweiz UWG).
- **Datenschutzerklärung** — beschreibt genau das, was die App macht: Kamera
  bleibt auf dem Gerät, Cloudflare für Räume und Sicherungen, Stripe fürs
  Bezahlen, sonst nichts. Keine Absätze über Google Analytics und Newsletter,
  die es hier nicht gibt.
- **Widerrufsbelehrung** — inklusive Muster-Widerrufsformular und der
  Erklärung, warum das Widerrufsrecht bei einer Sofort-Freischaltung endet.
- **Nutzungsbedingungen** — was gekauft wird, was es kostet (die Preise kommen
  aus dem Programmcode, können also nicht veralten), dass Becher-Designs keinen
  Spielvorteil geben, und dass der Code die Quittung ist.

Sobald der Block ausgefüllt ist, erscheint im Profil ein Punkt **„Rechtliches"**,
unter dem alles nachzulesen ist. Solange er leer ist, ist der Punkt nicht da —
ein Impressum, in dem „—" statt deines Namens steht, wäre schlimmer als keines.

### Die Widerrufs-Bestätigung

Wenn der Verkauf an ist, kommt vor **jedem** Kauf ein Fenster mit zwei Häkchen:
eines für die Bedingungen, eines dafür, dass sofort freigeschaltet werden soll
und das Widerrufsrecht damit endet. Beide sind Pflicht, beide beginnen leer,
und ohne beide führt kein Weg zur Bezahlseite.

Das ist nicht Schikane, sondern genau die Stelle, an der es sonst teuer wird:
Eine Freischaltung, die sofort passiert, ist nur dann nicht mehr widerrufbar,
wenn der Käufer vorher exakt diese beiden Dinge bestätigt hat. Fehlt das, kann
er 14 Tage lang sein Geld zurückverlangen, obwohl er alles längst benutzt.

---

## Teil 3: Was du bei Behörden erledigen musst

Das kann der Programmcode nicht für dich tun. **Mach es, bevor der erste Euro
fließt**, nicht danach — Stripe fragt dich bei der Freischaltung des
Live-Kontos ohnehin nach Steuernummer und Unternehmensform.

### In Deutschland

1. **Gewerbeanmeldung** beim Gewerbeamt deiner Stadt. 20–60 €, oft online,
   dauert eine Viertelstunde.
2. **Fragebogen zur steuerlichen Erfassung** beim Finanzamt, über ELSTER.
   Kommt nach der Gewerbeanmeldung automatisch.
3. Dort die **Kleinunternehmerregelung** (§ 19 UStG) wählen, wenn du unter
   25.000 € Umsatz im Jahr bleibst. Dann keine Umsatzsteuer, keine
   Voranmeldungen. In `OPERATOR` `smallBusiness: true` lassen.
4. Einnahmen kommen jährlich in die Steuererklärung (EÜR).

### In Österreich

1. **Gewerbeanmeldung** bei der Bezirksverwaltungsbehörde. Software ist ein
   freies Gewerbe, kostenlos.
2. Meldung ans **Finanzamt**, Steuernummer.
3. **Kleinunternehmergrenze** liegt bei 55.000 €.
4. Achtung: ab einem gewissen Gewinn kommt die **SVS-Pflichtversicherung**
   dazu. Das ist der Posten, der Leute überrascht.

### Beides betrifft dich zusätzlich

Verkaufst du digitale Produkte an Privatleute in anderen EU-Ländern, gilt dort
eigentlich deren Umsatzsteuer. Dafür gibt es das **OSS-Verfahren**. Unter
10.000 € EU-Auslandsumsatz darfst du bei deinem Heimatrecht bleiben — bei deiner
Größenordnung also erst mal kein Thema, aber gut zu wissen, dass es existiert.

### Wen du wirklich brauchst

Einen **Steuerberater**, einmal für ein Erstgespräch. Kostet oft 100–200 € und
beantwortet genau die Fragen, die sich hier stellen — für dein Land, deine
Situation, dein Einkommen. Ein Anwalt ist optional; der Steuerberater ist die
bessere Investition.

Wenn du doch einen Anwalt fragen willst, dann gezielt nach **einem** Punkt:
ob die Widerrufsbelehrung und die Verzichtserklärung in der Form, wie sie hier
stehen, für deinen Fall tragen. Das ist die Stelle mit Geld dran.

---

## Teil 4: Von Sandbox auf echt umstellen

Der Shop läuft im Moment gegen Stripes Testmodus. Um echtes Geld anzunehmen:

1. Stripe-Konto vollständig verifizieren (Ausweis, Bankverbindung,
   Steuernummer).
2. Einen **Live**-Schlüssel erzeugen (`sk_live_…`, nicht `sk_test_…`).
3. Auf dem Server setzen — **niemals** in den Programmcode oder in eine Datei
   im Repository:
   ```
   npx wrangler secret put STRIPE_SECRET_KEY
   ```
   oder im Cloudflare-Dashboard unter Workers → beerpong-rooms → Settings →
   Variables → **Encrypt**.
4. `LICENCE_SECRET` genauso setzen, falls noch nicht geschehen. Das ist der
   Schlüssel, mit dem die Freischaltcodes unterschrieben werden. Ändert man ihn
   später, werden **alle bereits verkauften Codes ungültig** — also einmal
   setzen und aufheben.
5. Einen echten Kauf mit deiner eigenen Karte machen, über 1,99 €. Das ist der
   einzige Test, der beweist, dass das Geld ankommt. Danach in Stripe
   zurückerstatten.

---

## Die Reihenfolge, die ich empfehlen würde

1. **Jetzt:** App ohne Verkauf veröffentlichen. Freunde spielen lassen, die
   Kamerafunktion am echten Tisch ausprobieren, Rückmeldungen sammeln.
2. **Wenn sich zeigt, dass es benutzt wird:** Steuerberater-Erstgespräch,
   Gewerbe anmelden, `OPERATOR` ausfüllen.
3. **Dann:** `SALES=on`, Live-Schlüssel, ein echter Testkauf.

Andersherum ist es unangenehm. Geld nehmen ohne Impressum ist genau das, was
abgemahnt wird — und das passiert einem kleinen Anbieter durchaus.

---

## Wo was steht

| Datei | Was drin ist |
|---|---|
| `lib/legal.ts` | Deine Angaben und alle vier Texte |
| `lib/sales.ts` | Der Schalter und was er umlegt |
| `app/legal.tsx` | Der Bildschirm „Rechtliches" |
| `components/ui/PurchaseConsent.tsx` | Die zwei Häkchen vor dem Kauf |
| `tools/test_sales.mjs` | Prüft, dass der Schalter aus ist, solange nichts eingerichtet ist |
| `tools/test_legal.mjs` | Prüft die Texte auf Lücken, Platzhalter und veraltete Paragraphen |
