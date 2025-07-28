import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  ShoppingCart,
  People,
  Business,
  Warning,
  Error,
  CheckCircle,
  Add,
  Visibility,
  Edit,
  Notifications,
  Assessment,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { dashboardApi } from '../../services/api/dashboardApi';
import { productsApi } from '../../services/api/productsApi';
import StatsCard from '../../components/dashboard/StatsCard';
import QuickActionsCard from '../../components/dashboard/QuickActionsCard';
import StockAlertsCard from '../../components/dashboard/StockAlertsCard';
import ChartCard from '../../components/dashboard/ChartCard';
import RecentMovementsCard from '../../components/dashboard/RecentMovementsCard';
import TopProductsCard from '../../components/dashboard/TopProductsCard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    dashboardApi.getStats,
    { refetchInterval: 60000 } // Refresh every minute
  );

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery(
    'low-stock-products',
    productsApi.getLowStockProducts,
    { refetchInterval: 300000 } // Refresh every 5 minutes
  );

  const { data: stockMovements, isLoading: movementsLoading } = useQuery(
    'recent-movements',
    () => dashboardApi.getRecentMovements(10),
    { refetchInterval: 60000 }
  );

  const { data: topProducts, isLoading: topProductsLoading } = useQuery(
    'top-products',
    () => dashboardApi.getTopProducts(5),
    { refetchInterval: 300000 }
  );

  const { data: stockTrends, isLoading: trendsLoading } = useQuery(
    'stock-trends',
    () => dashboardApi.getStockTrends(30), // Last 30 days
    { refetchInterval: 3600000 } // Refresh every hour
  );

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-product':
        navigate('/products/create');
        break;
      case 'stock-in':
        navigate('/stock/movements?type=in');
        break;
      case 'stock-out':
        navigate('/stock/movements?type=out');
        break;
      case 'view-reports':
        navigate('/reports');
        break;
      default:
        break;
    }
  };

  const getStockStatusColor = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return 'error';
    if (currentStock <= minStock) return 'warning';
    return 'success';
  };

  const getStockStatusIcon = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return <Error color="error" />;
    if (currentStock <= minStock) return <Warning color="warning" />;
    return <CheckCircle color="success" />;
  };

  if (statsLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bem-vindo ao sistema de gestão de stock. 
          Aqui encontra um resumo das suas operações.
        </Typography>
      </Box>

      {/* Alert for critical stock levels */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => navigate('/products?filter=low-stock')}
            >
              Ver Produtos
            </Button>
          }
        >
          <strong>{lowStockProducts.length}</strong> produtos com stock baixo ou esgotado
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total de Produtos"
            value={stats?.totalProducts || 0}
            trend={12}
            icon={<Inventory color="primary" />}
            color="primary"
            onClick={() => navigate('/products')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Valor do Stock"
            value={`€${(stats?.totalValue || 0).toLocaleString('pt-PT')}`}
            trend={5.4}
            icon={<TrendingUp color="success" />}
            color="success"
            onClick={() => navigate('/reports')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Fornecedores"
            value={stats?.totalSuppliers || 0}
            trend={2}
            icon={<Business color="info" />}
            color="info"
            onClick={() => navigate('/suppliers')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Clientes"
            value={stats?.totalCustomers || 0}
            trend={8.1}
            icon={<People color="warning" />}
            color="warning"
            onClick={() => navigate('/customers')}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <QuickActionsCard onAction={handleQuickAction} />
        </Grid>

        {/* Stock Alerts */}
        <Grid item xs={12} md={4}>
          <StockAlertsCard 
            alerts={lowStockProducts || []}
            loading={lowStockLoading}
          />
        </Grid>

        {/* Chart - Stock Trends */}
        <Grid item xs={12} md={4}>
          <ChartCard
            title="Tendência de Stock (30 dias)"
            data={stockTrends || []}
            loading={trendsLoading}
            type="line"
          />
        </Grid>

        {/* Recent Stock Movements */}
        <Grid item xs={12} md={8}>
          <RecentMovementsCard
            movements={stockMovements || []}
            loading={movementsLoading}
          />
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={4}>
          <TopProductsCard
            products={topProducts || []}
            loading={topProductsLoading}
          />
        </Grid>

        {/* Low Stock Products Detail */}
        {lowStockProducts && lowStockProducts.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Warning color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Produtos com Stock Crítico
                  </Typography>
                </Box>
                
                <List>
                  {lowStockProducts.slice(0, 5).map((product: any) => (
                    <ListItem
                      key={product.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={product.media?.primaryImage}
                          sx={{ bgcolor: 'primary.main' }}
                        >
                          {product.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={product.name}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              SKU: {product.sku}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${product.inventory.currentStock} ${product.inventory.unit}`}
                              color={getStockStatusColor(
                                product.inventory.currentStock,
                                product.inventory.minStock
                              )}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStockStatusIcon(
                            product.inventory.currentStock,
                            product.inventory.minStock
                          )}
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              edge="end"
                              onClick={() => navigate(`/products/${product.id}`)}
                              sx={{ ml: 1 }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                {lowStockProducts.length > 5 && (
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate('/products?filter=low-stock')}
                    >
                      Ver todos os {lowStockProducts.length} produtos
                    </Button>
                  </CardActions>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={() => navigate('/products/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
};

export default DashboardPage;