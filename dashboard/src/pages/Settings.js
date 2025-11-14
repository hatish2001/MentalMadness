import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  IntegrationInstructions as IntegrationIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { settingsAPI } from '../api/client';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [tabValue, setTabValue] = useState(0);
  const [companyName, setCompanyName] = useState(user?.company?.name || '');
  const [industry, setIndustry] = useState('Technology');
  const [employeeCount, setEmployeeCount] = useState('100-500');
  const [dataRetention, setDataRetention] = useState('90');
  const [anonymizeData, setAnonymizeData] = useState(true);
  const [autoEscalation, setAutoEscalation] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // Mock admin users
  const adminUsers = [
    {
      id: '1',
      name: user?.firstName + ' ' + user?.lastName,
      email: user?.email,
      role: 'Super Admin',
      addedDate: '2025-01-15',
      lastActive: 'Now',
    },
    {
      id: '2',
      name: 'Jane HR',
      email: 'jane.hr@company.com',
      role: 'HR Admin',
      addedDate: '2025-02-20',
      lastActive: '2 hours ago',
    },
  ];

  // Mock integrations
  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send notifications and reminders via Slack',
      status: 'connected',
      icon: '💬',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Integrate with Teams for notifications',
      status: 'not_connected',
      icon: '👥',
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Sync check-in reminders with calendars',
      status: 'not_connected',
      icon: '📅',
    },
    {
      id: 'hr_system',
      name: 'Workday',
      description: 'Sync employee data from HR system',
      status: 'connected',
      icon: '🏢',
    },
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSaveCompanySettings = () => {
    enqueueSnackbar('Company settings saved successfully', { variant: 'success' });
  };

  const handleAddAdmin = () => {
    setAdminDialogOpen(true);
  };

  const handleRemoveAdmin = (adminId) => {
    if (adminId === '1') {
      enqueueSnackbar('Cannot remove the primary admin', { variant: 'error' });
      return;
    }
    enqueueSnackbar('Admin removed successfully', { variant: 'success' });
  };

  const handleConnectIntegration = (integration) => {
    setSelectedIntegration(integration);
    setIntegrationDialogOpen(true);
  };

  const handleTestIntegration = (integrationId) => {
    enqueueSnackbar(`Testing ${integrationId} connection...`, { variant: 'info' });
    setTimeout(() => {
      enqueueSnackbar('Connection test successful!', { variant: 'success' });
    }, 2000);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Settings
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<BusinessIcon />} label="Company" />
            <Tab icon={<SecurityIcon />} label="Privacy & Security" />
            <Tab icon={<NotificationsIcon />} label="Notifications" />
            <Tab icon={<IntegrationIcon />} label="Integrations" />
            <Tab icon={<PeopleIcon />} label="Admin Users" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Company Settings */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Industry</InputLabel>
                  <Select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    label="Industry"
                  >
                    <MenuItem value="Technology">Technology</MenuItem>
                    <MenuItem value="Healthcare">Healthcare</MenuItem>
                    <MenuItem value="Finance">Finance</MenuItem>
                    <MenuItem value="Retail">Retail</MenuItem>
                    <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Employee Count</InputLabel>
                  <Select
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    label="Employee Count"
                  >
                    <MenuItem value="1-50">1-50</MenuItem>
                    <MenuItem value="50-100">50-100</MenuItem>
                    <MenuItem value="100-500">100-500</MenuItem>
                    <MenuItem value="500-1000">500-1000</MenuItem>
                    <MenuItem value="1000+">1000+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Billing Email"
                  value={user?.email}
                  disabled
                  helperText="Contact support to change billing email"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="info">
                  Current Plan: <strong>{user?.company?.tier || 'Starter'}</strong>
                  {user?.company?.tier !== 'enterprise' && (
                    <Button size="small" sx={{ ml: 2 }}>
                      Upgrade Plan
                    </Button>
                  )}
                </Alert>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleSaveCompanySettings}
                  startIcon={<CheckIcon />}
                >
                  Save Changes
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Privacy & Security */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Data Privacy
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Data Retention Period</InputLabel>
                  <Select
                    value={dataRetention}
                    onChange={(e) => setDataRetention(e.target.value)}
                    label="Data Retention Period"
                  >
                    <MenuItem value="30">30 days</MenuItem>
                    <MenuItem value="60">60 days</MenuItem>
                    <MenuItem value="90">90 days</MenuItem>
                    <MenuItem value="180">180 days</MenuItem>
                    <MenuItem value="365">1 year</MenuItem>
                    <MenuItem value="unlimited">Unlimited</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={anonymizeData}
                      onChange={(e) => setAnonymizeData(e.target.checked)}
                    />
                  }
                  label="Anonymize employee data after retention period"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Require two-factor authentication for admins"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Enable session timeout after 30 minutes of inactivity"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Log all admin actions for audit trail"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="success">
                  <Typography variant="subtitle2">HIPAA Compliance Status: Active</Typography>
                  <Typography variant="body2">
                    Last audit: Oct 15, 2025. All requirements met.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Notifications */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Alert Notifications
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoEscalation}
                      onChange={(e) => setAutoEscalation(e.target.checked)}
                    />
                  }
                  label="Auto-escalate critical alerts to all admins"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Email notifications for new alerts"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Daily summary of unresolved alerts"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Report Notifications
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={weeklyReports}
                      onChange={(e) => setWeeklyReports(e.target.checked)}
                    />
                  }
                  label="Send weekly wellness summary to admins"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch />}
                  label="Monthly compliance report"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Additional Email Recipients"
                  helperText="Comma-separated email addresses"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Integrations */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {integrations.map((integration) => (
                <Grid item xs={12} md={6} key={integration.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box display="flex" gap={2}>
                          <Typography variant="h4">{integration.icon}</Typography>
                          <Box>
                            <Typography variant="h6">
                              {integration.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {integration.description}
                            </Typography>
                            {integration.status === 'connected' && (
                              <Chip
                                icon={<CheckIcon />}
                                label="Connected"
                                size="small"
                                color="success"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Box>
                        </Box>
                        <Box>
                          {integration.status === 'connected' ? (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleTestIntegration(integration.id)}
                              >
                                <SecurityIcon />
                              </IconButton>
                              <IconButton size="small" color="error">
                                <CloseIcon />
                              </IconButton>
                            </>
                          ) : (
                            <Button
                              size="small"
                              onClick={() => handleConnectIntegration(integration)}
                            >
                              Connect
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Additional integrations are available in the Enterprise tier
            </Alert>
          </TabPanel>

          {/* Admin Users */}
          <TabPanel value={tabValue} index={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Admin Users</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddAdmin}
              >
                Add Admin
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Added</TableCell>
                    <TableCell>Last Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminUsers.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {admin.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{admin.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {admin.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={admin.role}
                          size="small"
                          color={admin.role === 'Super Admin' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{admin.addedDate}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={admin.lastActive === 'Now' ? 'success.main' : 'text.secondary'}
                        >
                          {admin.lastActive}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" disabled={admin.id === '1'}>
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveAdmin(admin.id)}
                          disabled={admin.id === '1'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              Ensure all admin users have completed security training and signed necessary agreements
            </Alert>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={adminDialogOpen} onClose={() => setAdminDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Admin User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            margin="normal"
            helperText="User must have an active employee account"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select value="hr_admin" label="Role">
              <MenuItem value="hr_admin">HR Admin</MenuItem>
              <MenuItem value="wellness_lead">Wellness Lead</MenuItem>
              <MenuItem value="super_admin">Super Admin</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            The user will receive an email invitation to access the admin dashboard
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            enqueueSnackbar('Admin invitation sent successfully', { variant: 'success' });
            setAdminDialogOpen(false);
          }}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Integration Dialog */}
      <Dialog open={integrationDialogOpen} onClose={() => setIntegrationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Connect {selectedIntegration?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You will be redirected to {selectedIntegration?.name} to authorize the connection
          </Alert>
          <Typography variant="body2" paragraph>
            MindCheck will request the following permissions:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Send notifications to channels" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Access user directory (read-only)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Create reminders and alerts" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            enqueueSnackbar(`Redirecting to ${selectedIntegration?.name}...`, { variant: 'info' });
            setIntegrationDialogOpen(false);
          }}>
            Authorize Connection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
