'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Personnel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  jobTitle?: string;
};

type PersonnelFile = {
  userId: string;
  jobTitle?: string;
};

type BidPreference = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  bidType: 'prefer' | 'avoid';
  date: string;
  shift: string;
  rank: number;
  note?: string;
};

type BidAward = BidPreference & {
  seniorityScore: number;
  preferenceScore: number;
  fairnessScore: number;
  conflictPenalty: number;
  totalScore: number;
  decision: string;
};

const BID_STORAGE_PREFIX = 'smartshift.bidding';

const shiftOptions = ['Gündüz 08:00 - 16:00', 'Akşam 16:00 - 00:00', 'Gece 00:00 - 08:00', 'Uzun Nöbet 08:00 - 20:00'];

const defaultDate = () => new Date().toISOString().slice(0, 10);

export default function BiddingPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [preferences, setPreferences] = useState<BidPreference[]>([]);
  const [awards, setAwards] = useState<BidAward[]>([]);
  const [storageKey, setStorageKey] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    bidType: 'prefer' as BidPreference['bidType'],
    date: defaultDate(),
    shift: shiftOptions[0],
    rank: '1',
    note: '',
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    const key = `${BID_STORAGE_PREFIX}.${currentUser?.tenantSlug ?? 'demo'}`;
    setStorageKey(key);

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { preferences?: BidPreference[]; awards?: BidAward[] };
        setPreferences(parsed.preferences ?? []);
        setAwards(parsed.awards ?? []);
      } catch {
        localStorage.removeItem(key);
      }
    }

    const token = getAccessToken();
    Promise.all([
      apiGet<Personnel[]>('/users', token ?? undefined),
      apiGet<PersonnelFile[]>('/employees/personnel-files', token ?? undefined).catch(() => []),
    ])
      .then(([users, profiles]) => {
        const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
        const employees = users
          .filter((user) => user.userType === 'employee')
          .map((user) => ({
            ...user,
            jobTitle: profileByUserId.get(user.id)?.jobTitle,
          }));
        setPersonnel(employees);
        setForm((current) => ({ ...current, employeeId: current.employeeId || employees[0]?.id || '' }));
      })
      .catch(() => setMessage('Personel listesi getirilemedi. Oturum veya yetki kontrolü yapın.'));
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ preferences, awards }));
  }, [awards, preferences, storageKey]);

  const selectedEmployee = useMemo(
    () => personnel.find((employee) => employee.id === form.employeeId),
    [form.employeeId, personnel],
  );

  const submitPreference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEmployee) {
      setMessage('Tercih eklemek için personel seçin.');
      return;
    }

    const preference: BidPreference = {
      id: `bid-${Date.now()}`,
      employeeId: selectedEmployee.id,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      employeeRole: selectedEmployee.jobTitle || 'Pozisyon yok',
      bidType: form.bidType,
      date: form.date,
      shift: form.shift,
      rank: Number(form.rank),
      note: form.note,
    };

    setPreferences((current) => [preference, ...current]);
    setAwards([]);
    setMessage('Personel tercihi kaydedildi.');
  };

  const generateAwards = () => {
    if (!preferences.length) {
      setMessage('Puanlanacak tercih yok. Önce personel tercihi ekleyin.');
      return;
    }

    const generated = preferences
      .map((preference) => {
        const employeeIndex = personnel.findIndex((employee) => employee.id === preference.employeeId);
        const seniorityScore = Math.max(20, 100 - Math.max(employeeIndex, 0) * 3);
        const preferenceScore = preference.bidType === 'prefer' ? Math.max(20, 110 - preference.rank * 15) : -35;
        const employeeBidCount = preferences.filter((item) => item.employeeId === preference.employeeId).length;
        const fairnessScore = Math.max(20, 80 - employeeBidCount * 5);
        const conflictPenalty = preference.bidType === 'avoid' ? 30 : 0;
        const totalScore = Math.round(seniorityScore * 0.25 + preferenceScore * 0.45 + fairnessScore * 0.25 - conflictPenalty);

        return {
          ...preference,
          seniorityScore,
          preferenceScore,
          fairnessScore,
          conflictPenalty,
          totalScore,
          decision: preference.bidType === 'avoid' ? 'Kaçınma tercihi dikkate alındı' : 'Atama adayı',
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    setAwards(generated);
    setMessage(`${generated.length} tercih kıdem, tercih sırası ve adalet puanına göre değerlendirildi.`);
  };

  const clearAll = () => {
    setPreferences([]);
    setAwards([]);
    setMessage('Bidding kayıtları temizlendi.');
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Tercih / Bidding
            </Typography>
            <Typography color="text.secondary">
              Personeller çalışmak istediği veya kaçınmak istediği günleri sıralar; sistem kıdem, tercih ve adalet puanıyla sonuç üretir.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" onClick={clearAll}>
              Temizle
            </Button>
            <Button variant="contained" onClick={generateAwards}>
              Sonuçları Üret
            </Button>
          </Stack>
        </Box>

        {message && (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: message.includes('getirilemedi') ? 'error.main' : 'success.main' }}>
            <CardContent>
              <Typography color={message.includes('getirilemedi') ? 'error' : 'success.main'}>{message}</Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Aktif Tercih Dönemi
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Personel aylık/haftalık çalışma tercihlerini bu ekrandan verir.
              </Typography>
              <Chip color="success" label="Açık" sx={{ mt: 2 }} />
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Puan Mantığı
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Toplam = Kıdem + Tercih sırası + Adalet - Çakışma/kaçınma cezası.
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Anti-Bias
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Cinsiyet, yaş gibi korumalı alanlar puana katılmaz; sadece görev, tercih, kıdem ve adalet kullanılır.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 4fr 4fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Tercih Ekle
              </Typography>
              <Stack component="form" spacing={2} onSubmit={submitPreference}>
                <TextField
                  select
                  label="Personel"
                  value={form.employeeId}
                  onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                  required
                >
                  {personnel.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.jobTitle || 'Pozisyon yok'}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Tercih tipi"
                  value={form.bidType}
                  onChange={(event) => setForm((current) => ({ ...current, bidType: event.target.value as BidPreference['bidType'] }))}
                >
                  <MenuItem value="prefer">Çalışmak istiyor</MenuItem>
                  <MenuItem value="avoid">Çalışmak istemiyor</MenuItem>
                </TextField>
                <TextField
                  label="Gün"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField select label="Vardiya" value={form.shift} onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value }))}>
                  {shiftOptions.map((shift) => (
                    <MenuItem key={shift} value={shift}>
                      {shift}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Sıra önceliği"
                  type="number"
                  value={form.rank}
                  onChange={(event) => setForm((current) => ({ ...current, rank: event.target.value }))}
                  slotProps={{ htmlInput: { min: 1, max: 5 } }}
                />
                <TextField label="Not" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
                <Button type="submit" variant="contained">
                  Tercihi Kaydet
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Girilen Tercihler
              </Typography>
              <Stack spacing={1} sx={{ mt: 2, maxHeight: 520, overflowY: 'auto', pr: 1 }}>
                {preferences.map((preference) => (
                  <Box key={preference.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>{preference.employeeName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {preference.employeeRole} · {preference.date} · {preference.shift}
                    </Typography>
                    <Chip
                      size="small"
                      color={preference.bidType === 'prefer' ? 'success' : 'warning'}
                      label={preference.bidType === 'prefer' ? `İstiyor #${preference.rank}` : `İstemiyor #${preference.rank}`}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ))}
                {!preferences.length && <Typography color="text.secondary">Henüz tercih girilmedi.</Typography>}
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Otomatik Sonuçlar
              </Typography>
              <Stack spacing={1} sx={{ mt: 2, maxHeight: 520, overflowY: 'auto', pr: 1 }}>
                {awards.map((award) => (
                  <Box key={award.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{award.employeeName}</Typography>
                      <Chip size="small" color={award.bidType === 'avoid' ? 'warning' : 'primary'} label={`Puan ${award.totalScore}`} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {award.date} · {award.shift}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Kıdem {award.seniorityScore} / Tercih {award.preferenceScore} / Adalet {award.fairnessScore} / Ceza {award.conflictPenalty}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {award.decision}
                    </Typography>
                  </Box>
                ))}
                {!awards.length && <Typography color="text.secondary">Sonuç üretmek için "Sonuçları Üret" butonuna basın.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </AppShell>
  );
}
