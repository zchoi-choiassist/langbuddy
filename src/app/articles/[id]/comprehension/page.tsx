import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ComprehensionQuiz } from '@/components/ComprehensionQuiz'
import { notFound, redirect } from 'next/navigation'
import type { ComprehensionQuestion } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ComprehensionPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('id, status, comprehension_questions')
    .eq('id', id)
    .eq('user_id', session!.user.id)
    .single()

  if (!article) notFound()
  if (article.status === 'completed') redirect(`/articles/${id}/summary`)
  const questions = (article.comprehension_questions ?? []) as ComprehensionQuestion[]

  return <ComprehensionQuiz articleId={id} questions={questions} />
}
