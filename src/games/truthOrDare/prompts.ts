export type Category = 'Harmlos' | 'Party' | 'Gewagt'

export const truths: Record<Category, string[]> = {
  Harmlos: [
    'Was ist deine peinlichste Kindheitserinnerung?',
    'Welche App nutzt du am meisten und warum?',
    'Was war dein bisher schlechtestes Geschenk?',
    'Welchen Film kannst du dir immer wieder ansehen?',
    'Was ist deine größte Marotte?',
    'Wovor hattest du als Kind am meisten Angst?',
    'Was würdest du tun, wenn du für einen Tag unsichtbar wärst?',
    'Was ist das Verrückteste, das du je gegessen hast?',
  ],
  Party: [
    'Wer hier hat wohl die größte Chance, berühmt zu werden – und warum?',
    'Was war dein peinlichster Moment in der Öffentlichkeit?',
    'Welche Lüge hast du zuletzt erzählt?',
    'Wenn du eine Person hier für einen Tag sein müsstest, wer wäre das?',
    'Was ist das Schlimmste, was du je auf einer Party gemacht hast?',
    'Welchen Spitznamen hattest du früher und wer hat ihn dir gegeben?',
    'Was denkst du wirklich über die Person zu deiner Linken?',
    'Wie lautet dein peinlichster Suchverlauf?',
  ],
  Gewagt: [
    'Wann hast du zuletzt jemanden angeschwindelt, um aus etwas rauszukommen?',
    'Was ist das Gewagteste, das du je getan hast, um jemanden zu beeindrucken?',
    'Hast du schon mal Gefühle für die/den Beste(n) Freund(in) von jemandem hier gehabt?',
    'Was ist dein größtes Geheimnis, das die meisten hier nicht kennen?',
    'Welche Person im Raum würdest du am ehesten daten?',
    'Was war dein peinlichster Moment beim Dating?',
    'Hast du schon mal eine Nachricht abgeschickt und es sofort bereut? Was stand drin?',
    'Was ist die unmoralischste Sache, die du je getan hast?',
  ],
}

export const dares: Record<Category, string[]> = {
  Harmlos: [
    'Mach 10 Kniebeugen.',
    'Imitiere ein Tier deiner Wahl, bis jemand errät welches.',
    'Sing die erste Strophe deines Lieblingslieds.',
    'Sprich für die nächste Runde mit einem Akzent deiner Wahl.',
    'Mach das peinlichste Selfie, das du gerade hinbekommst.',
    'Erzähle einen Witz – wenn niemand lacht, trinkst/wartest du eine Extra-Runde.',
    'Tanze 20 Sekunden lang ohne Musik.',
    'Lass dir von der Gruppe ein Wort geben und baue es in den nächsten 3 Sätzen ein, die du sagst.',
  ],
  Party: [
    'Schicke der letzten Person in deinem Chatverlauf ein Kompliment.',
    'Lass dir die Haare von einer anderen Person hier stylen.',
    'Rede die nächsten 3 Runden nur in Fragen.',
    'Mach eine Runde Impro-Theater mit der Person rechts von dir.',
    'Zeig das letzte Foto in deiner Galerie (wenn es nicht zu privat ist).',
    'Lass dich von der Gruppe für ein Foto in einer lustigen Pose fotografieren.',
    'Tausche für 2 Runden ein Kleidungsstück mit deinem Nachbarn.',
    'Sprich die nächsten zwei Minuten wie ein Nachrichtensprecher.',
  ],
  Gewagt: [
    'Ruf eine Person aus deinen Kontakten an und sing ihr ein Ständchen.',
    'Lass eine andere Person dein Handy 30 Sekunden lang durchsuchen.',
    'Verrate, wer in der Runde dein Schwarm wäre, wenn du single wärst.',
    'Erlaube der Gruppe, dir ein peinliches Wort für den restlichen Abend als Spitzname zu geben.',
    'Schick eine peinliche Emoji-Nachricht an die dritte Person in deiner Kontaktliste.',
    'Lass dir von jemandem einen Song aussuchen, zu dem du 15 Sekunden tanzen musst.',
    'Zeige dein letztes gesendetes Foto in einem Gruppenchat (sofern unbedenklich).',
    'Beantworte ehrlich: Wann hast du zuletzt jemanden aus dieser Runde vermisst?',
  ],
}

export const allCategories: Category[] = ['Harmlos', 'Party', 'Gewagt']
