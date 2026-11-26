'use client';

import { AppShell } from '@/components/app-shell';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function BillingPage() {
  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Abonelik ve Planlar
          </Typography>
          <Typography color="text.secondary">
            SaaS müşterilerinin planlarını, kullanıcı limitlerini, modül haklarını ve faturalama durumlarını yönetin.
          </Typography>
        </Box>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Platform Seviyesi Alan
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Bu ekran firma personel işlemleri için değil, SaaS abonelik yönetimi içindir.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
