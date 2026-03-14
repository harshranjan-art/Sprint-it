import { Routes, Route, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import IngestData from './pages/IngestData'
import Analysis from './pages/Analysis'
import Documents from './pages/Documents'
import Assignments from './pages/Assignments'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <main
        key={location.pathname}
        className="w-full max-w-[1120px] mx-auto px-6 py-10 max-md:px-4 max-md:py-6 page-enter"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ingest" element={<IngestData />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/assignments" element={<Assignments />} />
        </Routes>
      </main>
    </div>
  )
}
