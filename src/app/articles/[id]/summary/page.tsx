import Link from 'next/link'

interface Props {
  searchParams: Promise<{ total?: string; word?: string; comp?: string }>
}

export default async function SummaryPage({ searchParams }: Props) {
  const { total, word, comp } = await searchParams

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl font-bold mb-2">Article Complete!</h1>
      <p className="text-gray-400 mb-10">Here&apos;s how you did</p>

      <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Vocabulary quizzes</span>
          <span className="font-semibold text-lg">{word ?? 0} pts</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Comprehension</span>
          <span className="font-semibold text-lg">{comp ?? 0} pts</span>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between items-center">
          <span className="font-bold">Total score</span>
          <span className="font-bold text-2xl">{total ?? 0} pts</span>
        </div>
      </div>

      <Link
        href="/"
        className="w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold text-center block"
      >
        Back to reading list
      </Link>
    </div>
  )
}
