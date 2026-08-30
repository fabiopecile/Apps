export const ruleByRank: Record<string, { title: string; text: string }> = {
  A: {
    title: 'Wasserfall',
    text: 'Alle trinken gleichzeitig, beginnend bei dir. Aufhören darf erst, wer rechts von dir aufgehört hat.',
  },
  '2': { title: 'Du', text: 'Zeig auf jemanden – diese Person trinkt.' },
  '3': { title: 'Ich', text: 'Du trinkst.' },
  '4': {
    title: 'Boden',
    text: 'Alle berühren so schnell wie möglich den Boden. Wer zuletzt kommt, trinkt.',
  },
  '5': {
    title: 'Daumenmeister',
    text: 'Du bist Daumenmeister, bis die nächste 5 gezogen wird. Legst du jederzeit den Daumen auf den Tisch, müssen alle nachziehen – wer zuletzt reagiert, trinkt.',
  },
  '6': { title: 'Männer trinken', text: 'Alle Männer in der Runde trinken.' },
  '7': { title: 'Frauen trinken', text: 'Alle Frauen in der Runde trinken.' },
  '8': {
    title: 'Trinkbuddy',
    text: 'Wähl dir einen Trinkbuddy. Er trinkt ab jetzt immer mit dir mit, bis das Spiel endet.',
  },
  '9': {
    title: 'Reim',
    text: 'Sag ein Wort. Reihum muss sich jeder darauf reimen – wer nicht weiterweiß oder sich vertut, trinkt.',
  },
  '10': {
    title: 'Kategorie',
    text: 'Nenn eine Kategorie (z. B. Biersorten). Reihum muss jeder etwas dazu sagen – wer nichts mehr weiß, trinkt.',
  },
  J: {
    title: 'Neue Regel',
    text: 'Du stellst eine neue Regel auf, die bis zum Spielende gilt (z. B. „keine Vornamen sagen“). Wer dagegen verstößt, trinkt.',
  },
  Q: {
    title: 'Frage-Kette',
    text: 'Du stellst Fragen an andere. Wer stattdessen antwortet statt selbst eine Frage zurückzustellen, trinkt.',
  },
  K: {
    title: 'King’s Cup',
    text: 'Gieß etwas von deinem Getränk in den Kings Cup in der Mitte. Beim vierten König muss die Person, die ihn zieht, den ganzen Kings Cup austrinken!',
  },
}
