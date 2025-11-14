import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useDashboard } from '../contexts/DashboardContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useSnackbar } from 'notistack';

const InterventionCard = ({ intervention, onEdit }) => {
  const getTypeColor = (type) => {
    const colors = {
      breathing: '#3B82F6',
      meditation: '#8B5CF6',
      activity: '#10B981',
      journaling: '#F59E0B',
      social: '#EC4899',
      break: '#14B8A6',
    };
    return colors[type] || '#6B7280';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'breathing': return '🫁';
      case 'meditation': return '🧘';
      case 'activity': return '🏃';
      case 'journaling': return '✍️';
      case 'social': return '👥';
      case 'break': return '☕';
      default: return '💡';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h4">{getTypeIcon(intervention.type)}</Typography>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                {intervention.name}
              </Typography>
              <Chip
                label={intervention.type}
                size="small"
                sx={{ 
                  bgcolor: getTypeColor(intervention.type) + '20',
                  color: getTypeColor(intervention.type),
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
          <IconButton size="small" onClick={() => onEdit(intervention)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Times Used
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {intervention.times_shown}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Click Rate
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {intervention.click_rate || 0}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Helpful Rate
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight="bold">
                {intervention.helpful_rate || 0}%
              </Typography>
              {intervention.helpful_rate > 70 ? (
                <ThumbUpIcon color="success" fontSize="small" />
              ) : intervention.helpful_rate < 30 ? (
                <ThumbDownIcon color="error" fontSize="small" />
              ) : null}
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Stress Reduction
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="h5" fontWeight="bold">
                {Math.abs(intervention.stress_reduction || 0)}
              </Typography>
              {intervention.stress_reduction < 0 ? (
                <TrendingDownIcon color="success" fontSize="small" />
              ) : intervention.stress_reduction > 0 ? (
                <TrendingUpIcon color="error" fontSize="small" />
              ) : null}
            </Box>
          </Grid>
        </Grid>

        <LinearProgress
          variant="determinate"
          value={intervention.helpful_rate || 0}
          color={intervention.helpful_rate > 70 ? 'success' : intervention.helpful_rate < 30 ? 'error' : 'primary'}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
        />
      </CardContent>
    </Card>
  );
};

const Interventions = () => {
  const { timeRange, interventionsData } = useDashboard();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [selectedType, setSelectedType] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState(null);

  const handleEdit = (intervention) => {
    setSelectedIntervention(intervention);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedIntervention(null);
  };

  if (!interventionsData) {
    return (
      <Box>
        <Skeleton variant="text" height={40} width={300} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Skeleton variant="rectangular" height={250} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const { interventions = [], byTrigger = {}, summary = {} } = interventionsData;

  // Filter interventions by type
  const filteredInterventions = selectedType === 'all' 
    ? interventions 
    : interventions.filter(i => i.type === selectedType);

  // Prepare effectiveness by type chart
  const typeEffectivenessData = {
    labels: ['Breathing', 'Meditation', 'Activity', 'Journaling', 'Social', 'Break'],
    datasets: [{
      label: 'Effectiveness Rate',
      data: [
        interventions.filter(i => i.type === 'breathing').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'breathing').length || 0,
        interventions.filter(i => i.type === 'meditation').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'meditation').length || 0,
        interventions.filter(i => i.type === 'activity').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'activity').length || 0,
        interventions.filter(i => i.type === 'journaling').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'journaling').length || 0,
        interventions.filter(i => i.type === 'social').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'social').length || 0,
        interventions.filter(i => i.type === 'break').reduce((acc, i) => acc + (i.helpful_rate || 0), 0) / interventions.filter(i => i.type === 'break').length || 0,
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(20, 184, 166, 0.8)',
      ],
    }],
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Intervention Effectiveness
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => enqueueSnackbar('Add intervention feature coming in enterprise tier', { variant: 'info' })}
        >
          Add Intervention
        </Button>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption" gutterBottom>
                Most Used
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {summary.mostUsed || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption" gutterBottom>
                Most Effective
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {summary.mostEffective || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption" gutterBottom>
                Avg Click Rate
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {summary.averageClickRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption" gutterBottom>
                Avg Helpful Rate
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {summary.averageHelpfulRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Type Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <ToggleButtonGroup
            value={selectedType}
            exclusive
            onChange={(e, value) => value && setSelectedType(value)}
            size="small"
          >
            <ToggleButton value="all">All Types</ToggleButton>
            <ToggleButton value="breathing">Breathing</ToggleButton>
            <ToggleButton value="meditation">Meditation</ToggleButton>
            <ToggleButton value="activity">Activity</ToggleButton>
            <ToggleButton value="journaling">Journaling</ToggleButton>
            <ToggleButton value="social">Social</ToggleButton>
            <ToggleButton value="break">Break</ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Intervention Cards */}
      <Grid container spacing={3} mb={3}>
        {filteredInterventions.map((intervention, idx) => (
          <Grid item xs={12} md={6} lg={4} key={idx}>
            <InterventionCard
              intervention={intervention}
              onEdit={handleEdit}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Effectiveness by Type
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={typeEffectivenessData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: (value) => value + '%',
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Best Interventions by Stress Trigger
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stress Trigger</TableCell>
                      <TableCell>Most Effective</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(byTrigger).map(([trigger, interventions]) => {
                      const best = interventions[0];
                      return best ? (
                        <TableRow key={trigger}>
                          <TableCell>
                            {trigger.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={best.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {best.effectiveness}%
                          </TableCell>
                        </TableRow>
                      ) : null;
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Intervention</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Intervention editing is available in the Enterprise tier
          </Alert>
          {selectedIntervention && (
            <Box>
              <TextField
                fullWidth
                label="Name"
                value={selectedIntervention.name}
                disabled
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={selectedIntervention.type}
                  label="Type"
                  disabled
                >
                  <MenuItem value="breathing">Breathing</MenuItem>
                  <MenuItem value="meditation">Meditation</MenuItem>
                  <MenuItem value="activity">Activity</MenuItem>
                  <MenuItem value="journaling">Journaling</MenuItem>
                  <MenuItem value="social">Social</MenuItem>
                  <MenuItem value="break">Break</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Interventions;
