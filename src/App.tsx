import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { BudgetProvider } from "./context/BudgetContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CategoryProvider } from "./context/CategoryContext";
import { CardProvider } from "./context/CardContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { SavingsProvider } from "./context/SavingsContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";
import EditExpense from "./pages/EditExpense";
import History from "./pages/History";
import Cards from "./pages/Cards";
import Fuel from "./pages/Fuel";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import CalendarPage from "./pages/Calendar";
import AuthPage from "./pages/Auth";
import Savings from "./pages/Savings";
import { AppLoader } from "./components/AppLoader";

interface RequireAuthProps {
  children: React.ReactElement;
}

function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <AppLoader className="min-h-[50vh]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

import { ModalProvider } from "./context/ModalContext";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppSettingsProvider>
          <ToastProvider>
            <CategoryProvider>
              <CardProvider>
                <ExpenseProvider>
                  <SavingsProvider>
                    <BudgetProvider>
                      <ModalProvider>
                        <BrowserRouter>
                          <Routes>
                            <Route
                              path="/auth"
                              element={<AuthPage />}
                            />
                            <Route
                              path="/"
                              element={
                                <RequireAuth>
                                  <Layout />
                                </RequireAuth>
                              }
                            >
                              <Route
                                index
                                element={<Dashboard />}
                              />
                              <Route
                                path="calendar"
                                element={<CalendarPage />}
                              />
                              <Route
                                path="add"
                                element={<AddExpense />}
                              />
                              <Route
                                path="edit/:id"
                                element={<EditExpense />}
                              />
                              <Route
                                path="history"
                                element={<History />}
                              />
                              <Route
                                path="cards"
                                element={<Cards />}
                              />
                              <Route
                                path="fuel"
                                element={<Fuel />}
                              />
                              <Route
                                path="insights"
                                element={<Insights />}
                              />
                              <Route
                                path="settings"
                                element={<Settings />}
                              />
                              <Route
                                path="savings"
                                element={<Savings />}
                              />
                            </Route>
                          </Routes>
                        </BrowserRouter>
                      </ModalProvider>
                    </BudgetProvider>
                  </SavingsProvider>
                </ExpenseProvider>
              </CardProvider>
            </CategoryProvider>
          </ToastProvider>
        </AppSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
