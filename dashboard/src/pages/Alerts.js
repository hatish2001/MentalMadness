import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
  Skeleton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

const severityColors = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const AlertRow = ({ alert, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    onUpdate(alert.id, { action });
  };

  return (
    <>
      <TableRow
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          cursor: 'pointer',
          bgcolor: !alert.status.reviewed ? 'warning.light' : 'transparent',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell padding="checkbox">
          <Checkbox checked={alert.status.resolved} disabled />
        </TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={alert.severity.toUpperCase()}
              size="small"
              color={severityColors[alert.severity]}
            />
            <Typography variant="caption" color="text.secondary">
              {format(new Date(alert.flaggedAt), 'MMM d, h:mm a')}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {alert.employee.name.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {alert.employee.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {alert.employee.department}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
            {alert.reason}
          </Typography>
          {alert.triggerWords.length > 0 && (
            <Box display="flex" gap={0.5} mt={0.5}>
              {alert.triggerWords.slice(0, 3).map((word, idx) => (
                <Chip
                  key={idx}
                  label={word}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              ))}
              {alert.triggerWords.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{alert.triggerWords.length - 3} more
                </Typography>
              )}
            </Box>
          )}
        </TableCell>
        <TableCell>
          {alert.status.reviewed ? (
            <Box>
              <Chip
                icon={<CheckCircleIcon />}
                label="Reviewed"
                size="small"
                color="success"
                variant="outlined"
              />
              {alert.status.reviewedBy && (
                <Typography variant="caption" display="block" mt={0.5}>
                  by {alert.status.reviewedBy}
                </Typography>
              )}
            </Box>
          ) : (
            <Chip
              icon={<WarningIcon />}
              label="Pending Review"
              size="small"
              color="warning"
            />
          )}
        </TableCell>
        <TableCell align="right">
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0 }}>
            <Box p={3} bgcolor="background.default">
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" gutterBottom>
                    Check-in Details
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Stress Level: <strong>{alert.checkin.stressLevel}/10</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trigger: <strong>{alert.checkin.stressTrigger}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Time: <strong>{format(new Date(alert.checkin.time), 'PPpp')}</strong>
                    </Typography>
                  </Box>
                  
                  {alert.status.action && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Action Taken</Typography>
                      <Typography variant="body2">{alert.status.action}</Typography>
                      {alert.status.notes && (
                        <Typography variant="body2" mt={1}>
                          Notes: {alert.status.notes}
                        </Typography>
                      )}
                    </Alert>
                  )}
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Button
                      startIcon={<EmailIcon />}
                      variant="outlined"
                      size="small"
                      href={`mailto:${alert.employee.email}`}
                    >
                      Email Employee
                    </Button>
                    <Button
                      startIcon={<PhoneIcon />}
                      variant="outlined"
                      size="small"
                    >
                      Call Crisis Line
                    </Button>
                    <Button
                      startIcon={<PersonIcon />}
                      variant="outlined"
                      size="small"
                    >
                      View Profile
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </TableCell>
        </TableRow>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleAction('contacted_employee')}>
          Mark as Contacted
        </MenuItem>
        <MenuItem onClick={() => handleAction('escalated_to_hr')}>
          Escalate to HR
        </MenuItem>
        <MenuItem onClick={() => handleAction('scheduled_meeting')}>
          Schedule Meeting
        </MenuItem>
        <MenuItem onClick={() => handleAction('false_positive')}>
          False Positive
        </MenuItem>
      </Menu>
    </>
  );
};

const Alerts = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  const [filter, setFilter] = useState('unresolved');
  const [severity, setSeverity] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [resolveAlert, setResolveAlert] = useState(true);

  // Fetch alerts
  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', filter, severity],
    queryFn: () => dashboardAPI.getAlerts({
      status: filter,
      severity: severity === 'all' ? undefined : severity,
      limit: 100,
    }),
  });

  // Update alert mutation
  const updateMutation = useMutation({
    mutationFn: ({ alertId, updateData }) => dashboardAPI.updateAlert(alertId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      enqueueSnackbar('Alert updated successfully', { variant: 'success' });
      setDialogOpen(false);
    },
    onError: (error) => {
      enqueueSnackbar('Failed to update alert', { variant: 'error' });
    },
  });

  const handleAlertUpdate = (alertId, action) => {
    setSelectedAlert(alertId);
    if (typeof action === 'object') {
      setDialogOpen(true);
    } else {
      // Quick action
      updateMutation.mutate({
        alertId,
        updateData: {
          action,
          notes: `Quick action: ${action.replace('_', ' ')}`,
          resolved: action === 'false_positive',
        },
      });
    }
  };

  const handleDialogSubmit = () => {
    if (selectedAlert) {
      updateMutation.mutate({
        alertId: selectedAlert,
        updateData: {
          action: 'admin_review',
          notes: actionNotes,
          resolved: resolveAlert,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" height={40} width={200} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load alerts. Please try again.
      </Alert>
    );
  }

  const alerts = data?.data?.alerts || [];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Alert Management
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={2}>
              <ToggleButtonGroup
                value={filter}
                exclusive
                onChange={(e, value) => value && setFilter(value)}
                size="small"
              >
                <ToggleButton value="unresolved">
                  Unresolved
                </ToggleButton>
                <ToggleButton value="resolved">
                  Resolved
                </ToggleButton>
                <ToggleButton value="all">
                  All
                </ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup
                value={severity}
                exclusive
                onChange={(e, value) => value && setSeverity(value)}
                size="small"
              >
                <ToggleButton value="all">
                  All Severities
                </ToggleButton>
                <ToggleButton value="critical">
                  Critical
                </ToggleButton>
                <ToggleButton value="high">
                  High
                </ToggleButton>
                <ToggleButton value="medium">
                  Medium
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <FlagIcon color="action" />
              <Typography variant="body2" color="text.secondary">
                {alerts.length} alerts found
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">Status</TableCell>
              <TableCell>Severity & Time</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Review Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    No alerts found with current filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onUpdate={handleAlertUpdate}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Update Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Alert</DialogTitle>
        <DialogContent>
          <TextField
            label="Action Notes"
            multiline
            rows={4}
            fullWidth
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={resolveAlert}
                onChange={(e) => setResolveAlert(e.target.checked)}
              />
            }
            label="Mark as resolved"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDialogSubmit}
            variant="contained"
            disabled={!actionNotes.trim()}
          >
            Update Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Alerts;
