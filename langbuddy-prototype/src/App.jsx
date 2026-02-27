import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import ReadingList from './screens/ReadingList'
import ArticleProcessing from './screens/ArticleProcessing'
import ReadingView from './screens/ReadingView'
import Comprehension from './screens/Comprehension'
import SummaryScore from './screens/SummaryScore'
import WordBank from './screens/WordBank'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ReadingList />} />
          <Route path="/processing/:id" element={<ArticleProcessing />} />
          <Route path="/reading/:id" element={<ReadingView />} />
          <Route path="/comprehension/:id" element={<Comprehension />} />
          <Route path="/summary/:id" element={<SummaryScore />} />
          <Route path="/wordbank" element={<WordBank />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
