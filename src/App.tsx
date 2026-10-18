import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/Home'
import TheoryPage from '@/pages/Theory'
import LaboratoryPage from '@/pages/Laboratory'
import ComparisonPage from '@/pages/Comparison'
import ApplicationsPage from '@/pages/Applications'
import TeamPage from '@/pages/Team'
import PresentationPage from '@/pages/Presentation'
import NotFoundPage from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"             element={<HomePage />} />
          <Route path="/theory"       element={<TheoryPage />} />
          <Route path="/laboratory"   element={<LaboratoryPage />} />
          <Route path="/comparison"   element={<ComparisonPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/team"         element={<TeamPage />} />
          <Route path="/presentation" element={<PresentationPage />} />
          <Route path="*"             element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
