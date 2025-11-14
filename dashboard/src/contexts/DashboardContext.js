import React, { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';

const DashboardContext = createContext({});

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [timeRange, setTimeRange] = useState('7'); // Default to 7 days
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(5 * 60 * 1000); // 5 minutes

  // Dashboard data query
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: () => dashboardAPI.getDashboard(timeRange),
    refetchInterval: refreshInterval,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Heatmap data query
  const heatmapQuery = useQuery({
    queryKey: ['heatmap', timeRange, selectedDepartment],
    queryFn: () => dashboardAPI.getHeatmap({ 
      period: timeRange, 
      department: selectedDepartment 
    }),
    refetchInterval: refreshInterval,
    enabled: !!dashboardQuery.data, // Only fetch after dashboard data is loaded
  });

  // Alerts query
  const alertsQuery = useQuery({
    queryKey: ['alerts', 'unresolved'],
    queryFn: () => dashboardAPI.getAlerts({ status: 'unresolved', limit: 10 }),
    refetchInterval: 60 * 1000, // 1 minute for alerts
  });

  // Intervention effectiveness query
  const interventionsQuery = useQuery({
    queryKey: ['interventions', 'effectiveness', timeRange],
    queryFn: () => dashboardAPI.getInterventionEffectiveness({ period: timeRange }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const refreshAllData = () => {
    dashboardQuery.refetch();
    heatmapQuery.refetch();
    alertsQuery.refetch();
    interventionsQuery.refetch();
  };

  const value = {
    // State
    timeRange,
    setTimeRange,
    selectedDepartment,
    setSelectedDepartment,
    refreshInterval,
    setRefreshInterval,
    
    // Queries
    dashboardData: dashboardQuery.data?.data,
    isDashboardLoading: dashboardQuery.isLoading,
    dashboardError: dashboardQuery.error,
    
    heatmapData: heatmapQuery.data?.data,
    isHeatmapLoading: heatmapQuery.isLoading,
    
    alertsData: alertsQuery.data?.data,
    isAlertsLoading: alertsQuery.isLoading,
    unreadAlertsCount: alertsQuery.data?.data?.alerts?.filter(a => !a.status.reviewed).length || 0,
    
    interventionsData: interventionsQuery.data?.data,
    
    // Actions
    refreshAllData,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
