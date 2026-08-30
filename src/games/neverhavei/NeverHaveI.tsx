import { PromptDeck } from '../../components/PromptDeck'
import { categories } from './prompts'

export function NeverHaveI() {
  return (
    <PromptDeck
      title="Ich hab noch nie"
      emoji="🙈"
      gradient="from-pink-950 via-slate-950 to-slate-950"
      intro="Reihum wird eine Aussage vorgelesen. Wer's schon gemacht hat, trinkt (oder macht einen Finger runter)!"
      categories={categories}
    />
  )
}
