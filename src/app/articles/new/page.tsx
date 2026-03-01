import { ArticleProcessor } from '@/components/ArticleProcessor'

interface Props {
  searchParams: Promise<{ url?: string }>
}

export default async function NewArticlePage({ searchParams }: Props) {
  const { url } = await searchParams
  if (!url) return <p className="p-4 text-accent-vermillion">No URL provided.</p>
  return <ArticleProcessor url={url} />
}
