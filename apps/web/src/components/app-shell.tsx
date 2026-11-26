'use client';

import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import RuleIcon from '@mui/icons-material/Rule';
import TuneIcon from '@mui/icons-material/Tune';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getAccessToken, getCurrentUser } from '@/lib/auth';

const platformNavItems = [
  { label: 'Platform Özeti', href: '/', icon: <DashboardIcon /> },
  { label: 'SaaS Firmaları', href: '/saas', icon: <DomainAddIcon /> },
  { label: 'Abonelik ve Planlar', href: '/billing', icon: <PaymentsIcon /> },
  { label: 'Sektör Modülleri', href: '/industries', icon: <BusinessIcon /> },
  { label: 'Sistem Raporları', href: '/reports', icon: <AssessmentIcon /> },
  { label: 'Denetim ve Güvenlik', href: '/rules', icon: <RuleIcon /> },
];

const companyNavItems = [
  { label: 'Firma Özeti', href: '/', icon: <DashboardIcon />, permission: undefined },
  { label: 'Vardiya Planlama', href: '/scheduling', icon: <CalendarMonthIcon />, permission: 'schedules.read' },
  { label: 'Tercih / Bidding', href: '/bidding', icon: <TuneIcon />, permission: 'bids.read' },
  { label: 'Mesai Bildirimleri', href: '/attendance', icon: <AccessTimeIcon />, permission: 'requests.create' },
  { label: 'Personeller', href: '/employees', icon: <GroupsIcon />, permission: 'users.read' },
  { label: 'Talepler', href: '/requests', icon: <RequestQuoteIcon />, permission: 'requests.create' },
  { label: 'Kurallar ve Denetim', href: '/rules', icon: <RuleIcon />, permission: 'audit.read' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setUser(getCurrentUser());
  }, [router]);

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  const isPlatformAdmin = user?.permissions.includes('tenants.manage');
  const isEmployee = user?.roles.includes('employee');
  const navItems = isPlatformAdmin
    ? platformNavItems
    : companyNavItems.filter((item) => !item.permission || user?.permissions.includes(item.permission));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: 1300 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            SmartShift AI
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, opacity: 0.8 }}>
            {isPlatformAdmin ? 'Platform Admin Paneli' : isEmployee ? 'Personel Paneli' : 'Firma Admin Paneli'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {user && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.firstName} {user.lastName}
            </Typography>
          )}
          <Button color="inherit" onClick={logout}>
            Çıkış
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton key={item.href} component={Link} href={item.href}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
