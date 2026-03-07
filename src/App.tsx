import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ExpenseProvider } from './context/ExpenseContext'
import { BudgetProvider } from './context/BudgetContext'
import { UISettingsProvider } from './context/UISettingsContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CategoryProvider } from './context/CategoryContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AddExpense from './pages/AddExpense'
import EditExpense from './pages/EditExpense'
import History from './pages/History'
import Fuel from './pages/Fuel'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import AuthPage from './pages/Auth'
import { AppLoader } from './components/AppLoader'

interface RequireAuthProps {
  children: React.ReactElement
}

function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <AppLoader className="min-h-[50vh]" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <ExpenseProvider>
          <BudgetProvider>
            <UISettingsProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/"
                    element={
                      <RequireAuth>
                        <Layout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="add" element={<AddExpense />} />
                    <Route path="edit/:id" element={<EditExpense />} />
                    <Route path="history" element={<History />} />
                    <Route path="fuel" element={<Fuel />} />
                    <Route path="insights" element={<Insights />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </UISettingsProvider>
          </BudgetProvider>
        </ExpenseProvider>
      </CategoryProvider>
    </AuthProvider>
  )
}

export default App
