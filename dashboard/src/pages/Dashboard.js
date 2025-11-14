import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Psychology,
  People,
  Warning,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';
import { useDashboard } from '../contexts/DashboardContext';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StatCard = ({ title, value, subtitle, trend, icon, color = 'primary' }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp />;
    if (trend.direction === 'down') return <TrendingDown />;
    return <TrendingFlat />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    if (trend.direction === 'up') {
      return title.includes('Stress') ? 'error.main' : 'success.main';
    }
    if (trend.direction === 'down') {
      return title.includes('Stress') ? 'success.main' : 'error.main';
    }
    return 'text.secondary';
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="caption">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1} color={getTrendColor()}>
                {getTrendIcon()}
                <Typography variant="body2" ml={0.5}>
                  {trend.change > 0 ? '+' : ''}{trend.change}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const {
    timeRange,
    setTimeRange,
    dashboardData,
    isDashboardLoading,
    dashboardError,
    refreshAllData,
  } = useDashboard();

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  if (isDashboardLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} />
            </Grid>
          ))}
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (dashboardError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load dashboard data. Please try again.
      </Alert>
    );
  }

  const {
    companyHealthScore,
    metrics,
    dailyTrends,
    departmentBreakdown,
    topStressors,
    alerts,
  } = dashboardData || {};

  // Prepare chart data
  const stressTrendData = {
    labels: dailyTrends?.map(d => new Date(d.date).toLocaleDateString('en', { weekday: 'short' })) || [],
    datasets: [
      {
        label: 'Average Stress Level',
        data: dailyTrends?.map(d => d.averageStress) || [],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const stressTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Stress Level Trend',
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
      },
    },
  };

  const stressorData = {
    labels: topStressors?.map(s => s.trigger.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())) || [],
    datasets: [
      {
        data: topStressors?.map(s => s.percentage) || [],
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
      },
    ],
  };

  const departmentData = {
    labels: departmentBreakdown?.slice(0, 5).map(d => d.department) || [],
    datasets: [
      {
        label: 'Average Stress Level',
        data: departmentBreakdown?.slice(0, 5).map(d => d.averageStress) || [],
        backgroundColor: departmentBreakdown?.slice(0, 5).map(d => {
          if (d.averageStress >= 7) return 'rgba(220, 38, 38, 0.8)';
          if (d.averageStress >= 5) return 'rgba(251, 146, 60, 0.8)';
          return 'rgba(16, 185, 129, 0.8)';
        }) || [],
      },
    ],
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard Overview
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            aria-label="time range"
            size="small"
          >
            <ToggleButton value="7" aria-label="7 days">
              7 Days
            </ToggleButton>
            <ToggleButton value="30" aria-label="30 days">
              30 Days
            </ToggleButton>
            <ToggleButton value="90" aria-label="90 days">
              90 Days
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={refreshAllData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Company Health Score"
            value={companyHealthScore || 0}
            subtitle="out of 100"
            icon={<Psychology color="primary" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Stress Level"
            value={metrics?.averageStressLevel || 0}
            subtitle="out of 10"
            trend={metrics?.trend}
            icon={<TrendingUp color="warning" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Check-in Rate"
            value={`${metrics?.checkInCompletionRate || 0}%`}
            subtitle={`${metrics?.activeEmployees || 0} of ${metrics?.totalEmployees || 0} employees`}
            icon={<People color="info" />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Unresolved Alerts"
            value={alerts?.unreviewed || 0}
            subtitle="require attention"
            icon={<Warning color="error" />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Stress Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ height: 400 }}>
              <Line data={stressTrendData} options={stressTrendOptions} />
            </CardContent>
          </Card>
        </Grid>

        {/* Top Stressors */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Top Stress Triggers
              </Typography>
              <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut 
                  data={stressorData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Breakdown */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Department Stress Levels
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={departmentData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 10,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Department Details
          </Typography>
          <Grid container spacing={2}>
            {departmentBreakdown?.map((dept) => (
              <Grid item xs={12} sm={6} md={4} key={dept.department}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{dept.department}</Typography>
                      <Chip
                        size="small"
                        label={
                          dept.averageStress >= 7 ? 'Critical' :
                          dept.averageStress >= 5 ? 'Elevated' :
                          'Healthy'
                        }
                        color={
                          dept.averageStress >= 7 ? 'error' :
                          dept.averageStress >= 5 ? 'warning' :
                          'success'
                        }
                      />
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Stress
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {dept.averageStress}/10
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Active Employees
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {dept.activeEmployees}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dept.averageStress * 10}
                      color={
                        dept.averageStress >= 7 ? 'error' :
                        dept.averageStress >= 5 ? 'warning' :
                        'success'
                      }
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
