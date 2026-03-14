import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import IngestData from './pages/IngestData'
import Analysis from './pages/Analysis'
import Documents from './pages/Documents'
import Assignments from './pages/Assignments'

const pageTitles = {
  '/': 'Dashboard',
  '/ingest': 'Ingest Data',
  '/analysis': 'Analysis',
  '/documents': 'Documents',
  '/assignments': 'Assignments',
}

export default function App() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar title={title} />
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingest" element={<IngestData />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/assignments" element={<Assignments />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
