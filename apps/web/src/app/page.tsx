'use client';

import { AppShell } from '@/components/app-shell';
import { KpiCard } from '@/components/kpi-card';
import { getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setIsPlatformAdmin(Boolean(user?.permissions.includes('tenants.manage')));
    setIsEmployee(Boolean(user?.roles.includes('employee')));
  }, []);

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {isPlatformAdmin ? 'Platform Admin Paneli' : isEmployee ? 'Personel Paneli' : 'Firma Admin Paneli'}
          </Typography>
          <Typography color="text.secondary">
            {isPlatformAdmin
              ? 'SaaS firmaları, abonelikler, sektör modülleri ve platform güvenliği yönetimi.'
              : isEmployee
                ? 'İzin, masraf, avans ve aylık çalışma günü tercihlerinizi yönetin.'
                : 'Personel, vardiya, izin, masraf, avans ve operasyon süreçleri yönetimi.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Box>
            <KpiCard
              label={isPlatformAdmin ? 'SaaS Firma' : isEmployee ? 'Taleplerim' : 'Personel'}
              value={isPlatformAdmin ? '1' : '0'}
              helper={isPlatformAdmin ? 'Platformdaki aktif müşteri firmalar' : isEmployee ? 'Kendi oluşturduğunuz talepler' : 'Firmadaki aktif çalışanlar'}
            />
          </Box>
          <Box>
            <KpiCard
              label={isPlatformAdmin ? 'Aktif Plan' : 'Açık Vardiya'}
              value={isPlatformAdmin ? 'Starter' : '0'}
              helper={isPlatformAdmin ? 'Demo firmanın abonelik planı' : 'Atama bekleyen vardiyalar'}
            />
          </Box>
          <Box>
            <KpiCard
              label={isPlatformAdmin ? 'Sektör Modülü' : 'Bekleyen Talep'}
              value={isPlatformAdmin ? '5' : '0'}
              helper={isPlatformAdmin ? 'Kurumsal, havayolu, hastane, lojistik, üretim' : 'İzin, masraf ve avans talepleri'}
            />
          </Box>
          <Box>
            <KpiCard label="Sistem Durumu" value="OK" helper="API ve web uygulaması çalışıyor" />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 2 }}>
          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {isPlatformAdmin ? 'Platform Yönetim Mantığı' : isEmployee ? 'Personel Self-Service' : 'Firma Operasyon Mantığı'}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {isPlatformAdmin
                    ? 'Bu panel SmartShift AI şirketinin kendi yönetim panelidir. Burada müşteri SaaS firmaları oluşturulur, sektörleri seçilir, planları yönetilir ve sistem güvenliği takip edilir.'
                    : isEmployee
                      ? 'Bu panel personelin kendi işlemlerini yapması içindir. İzin, masraf, avans ve çalışma günü tercihleri buradan gönderilir.'
                      : 'Bu panel müşteri firmanın operasyon panelidir. Burada personeller, vardiyalar, talepler ve sektör kuralları yönetilir.'}
                </Typography>
                <Button component={Link} href={isPlatformAdmin ? '/saas' : isEmployee ? '/requests' : '/scheduling'} variant="contained" sx={{ mt: 2 }}>
                  {isPlatformAdmin ? 'SaaS Firması Oluştur' : isEmployee ? 'Talep Oluştur' : 'Vardiya Planlamaya Git'}
                </Button>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {isPlatformAdmin ? 'Sıradaki Platform İşlemleri' : 'Sıradaki Firma İşlemleri'}
                </Typography>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {isPlatformAdmin ? (
                    <>
                      <Typography>Yeni müşteri firmayı `SaaS Firmaları` ekranından oluşturun.</Typography>
                      <Typography>Firma sektörünü bir defa seçin: havayolu, hastane veya kurumsal.</Typography>
                      <Typography>Tenant kullanıcılarını ilgili firmaya ekleyin.</Typography>
                    </>
                  ) : (
                    <>
                      <Typography>Personel, departman ve lokasyonları tanımlayın.</Typography>
                      <Typography>Vardiya planlama ve talepler ekranlarını kullanın.</Typography>
                      <Typography>İzin, masraf ve avans taleplerini yönetin.</Typography>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Stack>
    </AppShell>
  );
}
