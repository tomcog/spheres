import { Routes, Route } from 'react-router-dom'
import TodayRoute from './routes/TodayRoute'
import SphereDetailRoute from './routes/SphereDetailRoute'
import DoneLogRoute from './routes/DoneLogRoute'
import SettingsRoute from './routes/SettingsRoute'
import MigrateRoute from './routes/MigrateRoute'
import NavBar from './components/NavBar'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<TodayRoute />} />
          <Route path="/sphere/:id" element={<SphereDetailRoute />} />
          <Route path="/log" element={<DoneLogRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/migrate" element={<MigrateRoute />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  )
}
