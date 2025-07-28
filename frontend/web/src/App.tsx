import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { store } from './store/store';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/common/LoadingScreen';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CreateProductPage from './pages/products/CreateProductPage';
import StockPage from './pages/stock/StockPage';
import StockMovementsPage from './pages/stock/StockMovementsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import CustomersPage from './pages/customers/CustomersPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UsersPage from './pages/users/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#f5325b',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            } 
          />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboard */}
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* Products */}
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/create" element={<CreateProductPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              
              {/* Stock Management */}
              <Route path="stock" element={<StockPage />} />
              <Route path="stock/movements" element={<StockMovementsPage />} />
              
              {/* Suppliers */}
              <Route path="suppliers" element={<SuppliersPage />} />
              
              {/* Customers */}
              <Route path="customers" element={<CustomersPage />} />
              
              {/* Reports */}
              <Route path="reports" element={<ReportsPage />} />
              
              {/* Users (Admin only) */}
              <Route path="users" element={<UsersPage />} />
              
              {/* Settings */}
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Profile */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4caf50',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#f44336',
                  secondary: '#fff',
                },
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;