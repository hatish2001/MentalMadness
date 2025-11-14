import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { Line } from 'react-chartjs-2';

const EmployeeDetailsDialog = ({ open, onClose, employeeId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employeeDetails', employeeId],
    queryFn: () => dashboardAPI.getEmployeeDetails(employeeId),
    enabled: !!employeeId && open,
  });

  if (!open) return null;

  const employee = data?.data;

  const stressTrendData = employee?.recentCheckIns ? {
    labels: employee.recentCheckIns.map(c => 
      format(new Date(c.created_at), 'MMM d')
    ).reverse(),
    datasets: [{
      label: 'Stress Level',
      data: employee.recentCheckIns.map(c => c.stress_level).reverse(),
      borderColor: 'rgb(79, 70, 229)',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      tension: 0.3,
    }],
  } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isLoading ? 'Loading...' : `${employee?.employee?.name} - Employee Details`}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load employee details</Alert>
        ) : !employee?.dataAvailable ? (
          <Alert severity="warning">
            {employee?.message || 'Employee has not consented to data sharing'}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ width: 60, height: 60 }}>
                      {employee.employee.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{employee.employee.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {employee.employee.role}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Department:</strong> {employee.employee.department}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Email:</strong> {employee.employee.email}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Manager:</strong> {employee.employee.manager || 'None'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Joined:</strong> {format(new Date(employee.employee.joinedAt), 'MMM yyyy')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={8}>
              {employee.trends?.hasWarningSign && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Warning Signs Detected</Typography>
                  {employee.trends.indicators.recentHighStress && (
                    <Typography variant="body2">• Consistently high stress levels</Typography>
                  )}
                  {employee.trends.indicators.rapidIncrease && (
                    <Typography variant="body2">• Rapid increase in stress levels</Typography>
                  )}
                  {employee.trends.indicators.repeatedTrigger && (
                    <Typography variant="body2">
                      • Repeated stress trigger: {employee.trends.indicators.repeatedTrigger}
                    </Typography>
                  )}
                </Alert>
              )}
              
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Stress Trend
                  </Typography>
                  {stressTrendData ? (
                    <Box sx={{ height: 300 }}>
                      <Line 
                        data={stressTrendData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: { beginAtZero: true, max: 10 }
                          }
                        }}
                      />
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No check-in data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {employee.recentCheckIns && employee.recentCheckIns.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Recent Check-ins
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Stress Level</TableCell>
                        <TableCell>Trigger</TableCell>
                        <TableCell>Intervention</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employee.recentCheckIns.slice(0, 5).map((checkin, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {format(new Date(checkin.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${checkin.stress_level}/10`}
                              size="small"
                              color={
                                checkin.stress_level >= 7 ? 'error' :
                                checkin.stress_level >= 5 ? 'warning' : 'success'
                              }
                            />
                          </TableCell>
                          <TableCell>{checkin.stress_trigger.replace('_', ' ')}</TableCell>
                          <TableCell>{checkin.intervention_shown || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {employee?.dataAvailable && (
          <>
            <Button startIcon={<EmailIcon />} href={`mailto:${employee.employee.email}`}>
              Contact Employee
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />}>
              Export Data
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Employees = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [stressFilter, setStressFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mock data - in production, this would come from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, rowsPerPage, search, department, stressFilter],
    queryFn: async () => {
      // Simulated API response
      return {
        data: {
          employees: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john.doe@company.com',
              department: 'Engineering',
              role: 'Senior Developer',
              averageStress: 6.5,
              lastCheckIn: new Date().toISOString(),
              checkInStreak: 14,
              trend: 'up',
              hasConsent: true,
            },
            {
              id: '2',
              name: 'Jane Smith',
              email: 'jane.smith@company.com',
              department: 'Sales',
              role: 'Account Manager',
              averageStress: 4.2,
              lastCheckIn: new Date().toISOString(),
              checkInStreak: 21,
              trend: 'stable',
              hasConsent: true,
            },
            {
              id: '3',
              name: 'Mike Johnson',
              email: 'mike.johnson@company.com',
              department: 'Engineering',
              role: 'Tech Lead',
              averageStress: 8.1,
              lastCheckIn: new Date(Date.now() - 86400000).toISOString(),
              checkInStreak: 0,
              trend: 'up',
              hasConsent: false,
              hasWarning: true,
            },
          ],
          total: 3,
          departments: ['Engineering', 'Sales', 'Marketing', 'HR'],
        },
      };
    },
  });

  const employees = data?.data?.employees || [];
  const departments = data?.data?.departments || [];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee.id);
    setDetailsOpen(true);
  };

  const getStressColor = (level) => {
    if (level >= 7) return 'error';
    if (level >= 5) return 'warning';
    return 'success';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUpIcon color="error" fontSize="small" />;
    if (trend === 'down') return <TrendingDownIcon color="success" fontSize="small" />;
    return null;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Employee Wellness
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => enqueueSnackbar('Export feature coming soon', { variant: 'info' })}
        >
          Export Report
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <ToggleButtonGroup
                value={stressFilter}
                exclusive
                onChange={(e, value) => value && setStressFilter(value)}
                size="small"
                fullWidth
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="high">High Stress</ToggleButton>
                <ToggleButton value="at-risk">At Risk</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={2}>
              <Chip
                icon={<InfoIcon />}
                label={`${employees.length} employees`}
                color="primary"
                variant="outlined"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <TableContainer component={Paper}>
        {isLoading ? (
          <Box p={3}>
            {[...Array(5)].map((_, idx) => (
              <Skeleton key={idx} height={60} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 3 }}>
            Failed to load employees
          </Alert>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department / Role</TableCell>
                  <TableCell>Avg Stress Level</TableCell>
                  <TableCell>Last Check-in</TableCell>
                  <TableCell>Streak</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow 
                    key={employee.id}
                    sx={{ 
                      bgcolor: employee.hasWarning ? 'error.light' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{employee.department}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.role}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={employee.averageStress.toFixed(1)}
                          size="small"
                          color={getStressColor(employee.averageStress)}
                        />
                        {getTrendIcon(employee.trend)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(new Date(employee.lastCheckIn), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="body2">{employee.checkInStreak}</Typography>
                        <Typography variant="caption" color="text.secondary">days</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {!employee.hasConsent ? (
                        <Tooltip title="No data sharing consent">
                          <Chip
                            icon={<WarningIcon />}
                            label="Limited Access"
                            size="small"
                            variant="outlined"
                            color="warning"
                          />
                        </Tooltip>
                      ) : employee.hasWarning ? (
                        <Chip
                          icon={<WarningIcon />}
                          label="Needs Attention"
                          size="small"
                          color="error"
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Active"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => handleViewDetails(employee)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data?.data?.total || 0}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </TableContainer>

      {/* Employee Details Dialog */}
      <EmployeeDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedEmployee(null);
        }}
        employeeId={selectedEmployee}
      />
    </Box>
  );
};

export default Employees;
