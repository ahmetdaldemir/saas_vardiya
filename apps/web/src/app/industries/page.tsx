'use client';

import { AppShell } from '@/components/app-shell';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function IndustriesPage() {
  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Sektör Modülleri
          </Typography>
          <Typography color="text.secondary">
            Havayolu, hastane, kurumsal, lojistik ve üretim modüllerinin platform seviyesinde yönetimi.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {['Havayolu', 'Hastane', 'Kurumsal'].map((industry) => (
            <Card key={industry} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {industry}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Yeni SaaS firması oluşturulurken seçilir. Firma içinde operasyon ekranları sektör kurallarına göre açılır.
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </AppShell>
  );
}
