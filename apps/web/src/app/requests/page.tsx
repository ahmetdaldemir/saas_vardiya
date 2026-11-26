'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';

type EmployeeRequest = {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  amount?: number;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, unknown>;
};

const requestTypeLabels: Record<string, string> = {
  leave: 'İzin Talebi',
  expense: 'Masraf Bildirimi',
  advance: 'Avans Talebi',
  work_preference: 'Aylık Çalışma Günü Tercihi',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    type: 'leave',
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    amount: '',
    currency: 'TRY',
    category: '',
    month: '',
    preferredDates: '',
    avoidDates: '',
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadRequests = async () => {
    const token = getAccessToken();
    const user = getCurrentUser();
    const path = user?.permissions.includes('requests.read') ? '/employee-requests' : '/employee-requests/mine';
    const rows = await apiGet<EmployeeRequest[]>(path, token ?? undefined);
    setRequests(rows);
  };

  useEffect(() => {
    loadRequests().catch(() => setMessage('Talepler getirilemedi. Oturum süresi dolmuş olabilir.'));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    try {
      const token = getAccessToken();
      await apiPost(
        '/employee-requests',
        {
          type: form.type,
          title: form.title || requestTypeLabels[form.type],
          description: form.description,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
          currency: form.currency,
          category: form.category,
          metadata:
            form.type === 'work_preference'
              ? {
                  month: form.month,
                  preferredDates: form.preferredDates.split(',').map((date) => date.trim()).filter(Boolean),
                  avoidDates: form.avoidDates.split(',').map((date) => date.trim()).filter(Boolean),
                  model: 'airline_preferential_bidding',
                }
              : {},
        },
        token ?? undefined,
      );
      setMessage('Talep oluşturuldu.');
      setForm({
        type: 'leave',
        title: '',
        description: '',
        startsAt: '',
        endsAt: '',
        amount: '',
        currency: 'TRY',
        category: '',
        month: '',
        preferredDates: '',
        avoidDates: '',
      });
      await loadRequests();
    } catch {
      setMessage('Talep oluşturulamadı. Zorunlu alanları ve oturumu kontrol edin.');
    }
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Talepler
          </Typography>
          <Typography color="text.secondary">
            Personel izin, masraf, avans ve aylık çalışma günü tercihlerini buradan oluşturur.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Yeni Talep Oluştur
              </Typography>
              <Stack spacing={2} component="form" onSubmit={submit}>
                <TextField select label="Talep tipi" value={form.type} onChange={(event) => updateForm('type', event.target.value)}>
                  <MenuItem value="leave">İzin talebi</MenuItem>
                  <MenuItem value="expense">Masraf bildirimi</MenuItem>
                  <MenuItem value="advance">Avans talebi</MenuItem>
                  <MenuItem value="work_preference">Aylık çalışma günü tercihi</MenuItem>
                </TextField>
                <TextField label="Başlık" value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
                <TextField label="Açıklama" value={form.description} onChange={(event) => updateForm('description', event.target.value)} multiline minRows={2} />

                {form.type === 'leave' && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Başlangıç"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) => updateForm('startsAt', event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      required
                    />
                    <TextField
                      label="Bitiş"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(event) => updateForm('endsAt', event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      required
                    />
                  </Box>
                )}

                {(form.type === 'expense' || form.type === 'advance') && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Tutar" type="number" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} required />
                    <TextField select label="Para birimi" value={form.currency} onChange={(event) => updateForm('currency', event.target.value)}>
                      <MenuItem value="TRY">TRY</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                    </TextField>
                    <TextField label="Kategori" value={form.category} onChange={(event) => updateForm('category', event.target.value)} />
                  </Box>
                )}

                {form.type === 'work_preference' && (
                  <Stack spacing={2}>
                    <TextField
                      label="Ay"
                      type="month"
                      value={form.month}
                      onChange={(event) => updateForm('month', event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      required
                    />
                    <TextField
                      label="Çalışmak istediği günler"
                      helperText="Virgülle ayırın. Örnek: 2026-05-03, 2026-05-08"
                      value={form.preferredDates}
                      onChange={(event) => updateForm('preferredDates', event.target.value)}
                      required
                    />
                    <TextField
                      label="Çalışmak istemediği günler"
                      helperText="Havayolu line bidding mantığında gün-off tercihi gibi kullanılır."
                      value={form.avoidDates}
                      onChange={(event) => updateForm('avoidDates', event.target.value)}
                    />
                  </Stack>
                )}

                {message && <Typography color={message.includes('oluşturuldu') ? 'success.main' : 'error'}>{message}</Typography>}
                <Button type="submit" variant="contained">
                  Talep Gönder
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Talep Listesi
                    </Typography>
                    <Typography color="text.secondary">Kendi talepleriniz veya yetkinize göre firma talepleri.</Typography>
                  </Box>
                  <Button variant="outlined" onClick={() => loadRequests()}>
                    Yenile
                  </Button>
                </Box>
                <Stack spacing={1.5}>
                  {requests.map((request) => (
                    <Card key={request.id} variant="outlined">
                      <CardContent>
                        <Typography sx={{ fontWeight: 700 }}>{request.title}</Typography>
                        <Typography color="text.secondary">{requestTypeLabels[request.type] ?? request.type}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                          <Chip label={request.status} size="small" color="primary" />
                          {request.amount && <Chip label={`${request.amount} ${request.currency ?? 'TRY'}`} size="small" />}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
                {!requests.length && <Typography color="text.secondary">Henüz talep yok.</Typography>}
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Otomasyon Akışı
            </Typography>
            <Stack spacing={1.2} sx={{ mt: 2 }}>
              <Typography>İzin talepleri yönetici onayına gider.</Typography>
              <Typography>Masraf ve avans talepleri yönetici onayından sonra muhasebeye aktarılır.</Typography>
              <Typography>Aylık çalışma günü tercihleri vardiya/bidding motorunda tercih sinyali olarak kullanılır.</Typography>
              <Typography>Havayolu firmalarında bu model line bidding ve gün-off tercihi mantığıyla çalışır.</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
