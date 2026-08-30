import { PromptDeck } from '../../components/PromptDeck'
import { categories } from './prompts'

export function MostLikely() {
  return (
    <PromptDeck
      title="Wer würde eher"
      emoji="👉"
      gradient="from-fuchsia-950 via-slate-950 to-slate-950"
      intro="Frage wird vorgelesen, alle zeigen gleichzeitig auf die Person, auf die es am ehesten zutrifft!"
      categories={categories}
    />
  )
}
