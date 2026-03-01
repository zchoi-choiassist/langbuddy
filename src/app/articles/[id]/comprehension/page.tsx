import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ComprehensionQuiz } from '@/components/ComprehensionQuiz'
import { notFound, redirect } from 'next/navigation'

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

  return <ComprehensionQuiz articleId={id} questions={article.comprehension_questions as any} />
}
