import { createClient } from '@supabase/supabase-js'
import vocabulary from './topik-vocabulary.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  const BATCH = 500
  for (let i = 0; i < vocabulary.length; i += BATCH) {
    const batch = vocabulary.slice(i, i + BATCH)
    const { error } = await supabase.from('topik_words').insert(batch)
    if (error) throw error
    console.log(`Inserted ${i + batch.length} / ${vocabulary.length}`)
  }
  console.log('Done.')
}

seed().catch(console.error)
