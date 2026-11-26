'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';

const sectors = [
  { value: 'corporate', label: 'Kurumsal Firma' },
  { value: 'airline', label: 'Havayolu' },
  { value: 'hospital', label: 'Hastane' },
  { value: 'logistics', label: 'Lojistik' },
  { value: 'manufacturing', label: 'Üretim' },
];

type Tenant = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  plan: string;
  status: string;
  timezone: string;
};

type TenantUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
};

const sectorLabels = Object.fromEntries(sectors.map((sector) => [sector.value, sector.label]));

export default function SaasPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('corporate');
  const [plan, setPlan] = useState('starter');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [listError, setListError] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('Admin123!');
  const [userMessage, setUserMessage] = useState('');

  const loadTenants = async () => {
    try {
      const token = getAccessToken();
      const rows = await apiGet<Tenant[]>('/tenants', token ?? undefined);
      setTenants(rows);
      setSelectedTenantId((current) => current || rows[0]?.id || '');
      setListError('');
    } catch {
      setListError('SaaS firmaları getirilemedi. Oturum süresi dolmuş olabilir, çıkış yapıp tekrar giriş yapın.');
    }
  };

  const loadTenantUsers = async (tenantId = selectedTenantId) => {
    if (!tenantId) {
      setTenantUsers([]);
      return;
    }

    const token = getAccessToken();
    const rows = await apiGet<TenantUser[]>(`/tenants/${tenantId}/users`, token ?? undefined);
    setTenantUsers(rows);
  };

  useEffect(() => {
    if (selectedTenantId) {
      loadTenantUsers(selectedTenantId).catch(() => setUserMessage('Kullanıcı listesi getirilemedi.'));
    }
  }, [selectedTenantId]);

  const submitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserMessage('');

    try {
      const token = getAccessToken();
      await apiPost(
        `/tenants/${selectedTenantId}/users`,
        {
          firstName: userFirstName,
          lastName: userLastName,
          email: userEmail,
          password: userPassword,
          userType: 'admin',
        },
        token ?? undefined,
      );
      setUserMessage('Kullanıcı tenant içine eklendi.');
      setUserFirstName('');
      setUserLastName('');
      setUserEmail('');
      setUserPassword('Admin123!');
      await loadTenantUsers();
    } catch {
      setUserMessage('Kullanıcı eklenemedi. E-posta benzersiz olmalı ve oturum geçerli olmalı.');
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = getAccessToken();
      await apiPost('/tenants', { name, slug, industry, plan, timezone: 'Europe/Istanbul' }, token ?? undefined);
      setMessage('SaaS firması oluşturuldu. Bu sektör seçimi normal admin tarafından sonradan değiştirilemez.');
      setName('');
      setSlug('');
      setIndustry('corporate');
      setPlan('starter');
      await loadTenants();
    } catch {
      setMessage('Firma oluşturulamadı. Tenant kodu benzersiz olmalı ve oturum geçerli olmalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            SaaS Firması Oluşturma
          </Typography>
          <Typography color="text.secondary">
            Yeni müşteri firmayı burada oluşturun. Sektör seçimi bir kez yapılır ve firmaya özel modüller otomatik açılır.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack spacing={2.5} component="form" onSubmit={submit}>
                <TextField label="Firma adı" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
                <TextField
                  label="Tenant kodu"
                  helperText="Örnek: acme, demo, hastane-istanbul. Girişte bu kod kullanılacak."
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                  fullWidth
                />
                <TextField select label="Sektör" value={industry} onChange={(event) => setIndustry(event.target.value)} fullWidth>
                  {sectors.map((sector) => (
                    <MenuItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Plan" value={plan} onChange={(event) => setPlan(event.target.value)} fullWidth>
                  <MenuItem value="starter">Starter</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </TextField>
                {message && <Typography color={message.includes('oluşturuldu') ? 'success.main' : 'error'}>{message}</Typography>}
                <Button type="submit" variant="contained" size="large" disabled={loading}>
                  {loading ? 'Oluşturuluyor...' : 'SaaS Firması Oluştur'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Sektör Seçimi Nasıl Çalışır?
              </Typography>
              <Stack spacing={1.4} sx={{ mt: 2 }}>
                <Typography>Havayolu seçilirse crew, uçuş görevi, legality ve line bidding kuralları açılır.</Typography>
                <Typography>Hastane seçilirse nöbet, on-call, acil kapsama ve klinik yetkinlik kuralları açılır.</Typography>
                <Typography>Kurumsal seçilirse departman, izin, masraf, avans ve standart vardiya süreçleri açılır.</Typography>
                <Typography>Sektör değişimi veri yapısını etkilediği için sonradan normal admin tarafından değiştirilmez.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Tenant'a Firma Admini Ekle
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Platform tarafından sadece firma admin hesabı oluşturulur. Personel özlük dosyaları firma panelinde açılır.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 2 }}>
              <Stack spacing={2} component="form" onSubmit={submitUser}>
                <TextField
                  select
                  label="Firma / Tenant"
                  value={selectedTenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                  required
                  fullWidth
                >
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Ad" value={userFirstName} onChange={(event) => setUserFirstName(event.target.value)} required />
                <TextField label="Soyad" value={userLastName} onChange={(event) => setUserLastName(event.target.value)} required />
                <TextField label="E-posta" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} required />
                <TextField
                  label="Şifre"
                  type="password"
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                  required
                />
                {userMessage && (
                  <Typography color={userMessage.includes('eklendi') ? 'success.main' : 'error'}>{userMessage}</Typography>
                )}
                <Button type="submit" variant="contained" disabled={!selectedTenantId}>
                  Firma Admini Ekle
                </Button>
              </Stack>

              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Seçili Tenant Kullanıcıları</Typography>
                <Stack spacing={1} sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                  {tenantUsers.map((user) => (
                    <Card key={user.id} variant="outlined">
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography color="text.secondary">{user.email}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip label={user.userType} size="small" color="primary" />
                          <Chip label={user.status} size="small" color={user.status === 'active' ? 'success' : 'default'} />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
                {!tenantUsers.length && (
                  <Typography color="text.secondary">Bu tenant için henüz kullanıcı yok.</Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Oluşturulan SaaS Firmaları
                </Typography>
                <Typography color="text.secondary">
                  Platforma kayıtlı müşteri firmalar ve seçilen sektörleri.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={loadTenants}>
                Listeyi Yenile
              </Button>
            </Box>

            {listError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {listError}
              </Typography>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
              {tenants.map((tenant) => (
                <Card key={tenant.id} variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {tenant.name}
                    </Typography>
                    <Typography color="text.secondary">Firma kodu: {tenant.slug}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                      <Chip label={sectorLabels[tenant.industry] ?? tenant.industry} color="primary" size="small" />
                      <Chip label={tenant.plan} size="small" />
                      <Chip label={tenant.status} color={tenant.status === 'active' ? 'success' : 'default'} size="small" />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {!tenants.length && !listError && (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Henüz SaaS firması yok.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
