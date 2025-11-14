import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSnackbar } from 'notistack';
import { useDashboard } from '../contexts/DashboardContext';

const reportTypes = [
  {
    id: 'compliance',
    name: 'Compliance Report',
    description: 'HIPAA-compliant wellness metrics and participation rates',
    icon: <AssessmentIcon />,
    fields: ['dateRange', 'departments'],
  },
  {
    id: 'wellness',
    name: 'Wellness Summary',
    description: 'Overall company wellness trends and stress analysis',
    icon: <AssessmentIcon />,
    fields: ['dateRange', 'includeInterventions'],
  },
  {
    id: 'department',
    name: 'Department Analysis',
    description: 'Detailed breakdown by department with recommendations',
    icon: <AssessmentIcon />,
    fields: ['dateRange', 'department'],
  },
  {
    id: 'intervention',
    name: 'Intervention Effectiveness',
    description: 'Analysis of intervention usage and effectiveness',
    icon: <AssessmentIcon />,
    fields: ['dateRange', 'interventionTypes'],
  },
  {
    id: 'employee',
    name: 'Employee Engagement',
    description: 'Check-in rates, streaks, and engagement metrics',
    icon: <AssessmentIcon />,
    fields: ['dateRange', 'includeInactive'],
  },
];

const Reports = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { dashboardData } = useDashboard();
  
  const [selectedReport, setSelectedReport] = useState('');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [department, setDepartment] = useState('all');
  const [includeInterventions, setIncludeInterventions] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Get compliance report for preview
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['complianceReport', dateRange],
    queryFn: () => dashboardAPI.getComplianceReport({
      startDate: format(dateRange.start, 'yyyy-MM-dd'),
      endDate: format(dateRange.end, 'yyyy-MM-dd'),
    }),
    enabled: previewDialogOpen && selectedReport === 'compliance',
  });

  // Mock scheduled reports data
  const scheduledReports = [
    {
      id: '1',
      type: 'compliance',
      frequency: 'weekly',
      recipients: ['admin@company.com', 'hr@company.com'],
      lastSent: new Date(Date.now() - 86400000 * 3),
      nextScheduled: new Date(Date.now() + 86400000 * 4),
    },
    {
      id: '2',
      type: 'wellness',
      frequency: 'monthly',
      recipients: ['ceo@company.com'],
      lastSent: new Date(Date.now() - 86400000 * 15),
      nextScheduled: new Date(Date.now() + 86400000 * 15),
    },
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      enqueueSnackbar('Please select a report type', { variant: 'warning' });
      return;
    }

    enqueueSnackbar('Generating report...', { variant: 'info' });
    
    // In production, this would call the actual API
    setTimeout(() => {
      enqueueSnackbar('Report generated successfully! Downloading...', { variant: 'success' });
      // Trigger download
    }, 2000);
  };

  const handlePreviewReport = () => {
    if (!selectedReport) {
      enqueueSnackbar('Please select a report type', { variant: 'warning' });
      return;
    }
    setPreviewDialogOpen(true);
  };

  const handleScheduleReport = () => {
    if (!selectedReport) {
      enqueueSnackbar('Please select a report type', { variant: 'warning' });
      return;
    }
    setScheduleDialogOpen(true);
  };

  const departments = dashboardData?.departmentBreakdown?.map(d => d.department) || [];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Reports & Analytics
      </Typography>

      {/* Report Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generate Report
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  label="Report Type"
                >
                  {reportTypes.map((report) => (
                    <MenuItem key={report.id} value={report.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {report.icon}
                        <Box>
                          <Typography variant="body1">{report.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {selectedReport && (
              <>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                {reportTypes.find(r => r.id === selectedReport)?.fields.includes('department') && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
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
                )}
              </>
            )}
          </Grid>

          <Box display="flex" gap={2} mt={3}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleGenerateReport}
              disabled={!selectedReport}
            >
              Generate & Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={handlePreviewReport}
              disabled={!selectedReport}
            >
              Preview
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={handleScheduleReport}
              disabled={!selectedReport}
            >
              Schedule
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Reports
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Type</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Generated By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Compliance Report</TableCell>
                  <TableCell>{format(new Date(), 'MMM d, yyyy h:mm a')}</TableCell>
                  <TableCell>Oct 1 - Oct 31, 2025</TableCell>
                  <TableCell>John Admin</TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Wellness Summary</TableCell>
                  <TableCell>{format(subMonths(new Date(), 1), 'MMM d, yyyy h:mm a')}</TableCell>
                  <TableCell>Sep 1 - Sep 30, 2025</TableCell>
                  <TableCell>Jane HR</TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scheduled Reports
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Type</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Recipients</TableCell>
                  <TableCell>Next Scheduled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scheduledReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {reportTypes.find(r => r.id === report.type)?.name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={report.frequency} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {report.recipients.map((email, idx) => (
                        <Chip
                          key={idx}
                          label={email}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {format(report.nextScheduled, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Report Preview - {reportTypes.find(r => r.id === selectedReport)?.name}
        </DialogTitle>
        <DialogContent>
          {complianceLoading ? (
            <Box>
              <Skeleton variant="text" height={40} />
              <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
            </Box>
          ) : complianceData ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This is a preview. Download the full report for complete details.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Participation</Typography>
                      <Typography variant="h3">
                        {complianceData.data.report.participation.participationRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {complianceData.data.report.participation.activeUsers} of {' '}
                        {complianceData.data.report.participation.totalUsers} employees
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Stress Reduction</Typography>
                      <Typography variant="h3">
                        {complianceData.data.report.outcomes.stressReductionPercentage}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        From {complianceData.data.report.outcomes.initialAverageStress} to {' '}
                        {complianceData.data.report.outcomes.finalAverageStress}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography>Select a report type to preview</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Download Full Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Report</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Report scheduling is available in the Enterprise tier
          </Alert>
          <FormControl fullWidth margin="normal">
            <InputLabel>Frequency</InputLabel>
            <Select value="weekly" label="Frequency" disabled>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Recipients"
            helperText="Comma-separated email addresses"
            margin="normal"
            disabled
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
