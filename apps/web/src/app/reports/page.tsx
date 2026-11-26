'use client';

import { AppShell } from '@/components/app-shell';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function ReportsPage() {
  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Sistem Raporları
          </Typography>
          <Typography color="text.secondary">
            Platform genelinde firma sayısı, aktif kullanıcı, abonelik, sektör dağılımı ve sistem sağlığı raporları.
          </Typography>
        </Box>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Platform Raporlama
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Vardiya ve personel raporları müşteri firma panelinde yer almalıdır.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
