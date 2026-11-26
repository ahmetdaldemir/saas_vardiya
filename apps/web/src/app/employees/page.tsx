'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';

type PersonnelFile = {
  id: string;
  userId: string;
  employeeNumber?: string;
  identityNumber?: string;
  phone?: string;
  jobTitle?: string;
  employmentType?: string;
  startDate?: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export default function EmployeesPage() {
  const [files, setFiles] = useState<PersonnelFile[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Personel123!',
    employeeNumber: '',
    identityNumber: '',
    phone: '',
    jobTitle: '',
    employmentType: 'full_time',
    startDate: '',
    birthDate: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankIban: '',
    salaryAmount: '',
    salaryCurrency: 'TRY',
    salaryPeriod: 'monthly',
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadFiles = async () => {
    const user = getCurrentUser();
    if (!user?.permissions.includes('users.read')) {
      setMessage('Bu sayfayı görüntüleme yetkiniz yok. Personel paneli için Talepler ekranını kullanın.');
      setFiles([]);
      return;
    }

    const token = getAccessToken();
    const rows = await apiGet<PersonnelFile[]>('/employees/personnel-files', token ?? undefined);
    setFiles(rows);
  };

  useEffect(() => {
    loadFiles().catch(() => setMessage('Özlük dosyaları getirilemedi. Oturum süresi dolmuş olabilir.'));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    try {
      const token = getAccessToken();
      await apiPost('/employees/personnel-files', form, token ?? undefined);
      setMessage('Personel ve özlük dosyası oluşturuldu.');
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: 'Personel123!',
        employeeNumber: '',
        identityNumber: '',
        phone: '',
        jobTitle: '',
        employmentType: 'full_time',
        startDate: '',
        birthDate: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        bankIban: '',
        salaryAmount: '',
        salaryCurrency: 'TRY',
        salaryPeriod: 'monthly',
      });
      await loadFiles();
    } catch {
      setMessage('Personel oluşturulamadı. E-posta benzersiz olmalı ve oturum geçerli olmalı.');
    }
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Personeller
            </Typography>
            <Typography color="text.secondary">
              Firma panelinden personel ekleyin, özlük dosyası oluşturun ve temel çalışan bilgilerini yönetin.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '6fr 6fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Personel / Özlük Dosyası Oluştur
              </Typography>
              <Stack spacing={2} component="form" onSubmit={submit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField label="Ad" value={form.firstName} onChange={(event) => updateForm('firstName', event.target.value)} required />
                  <TextField label="Soyad" value={form.lastName} onChange={(event) => updateForm('lastName', event.target.value)} required />
                  <TextField label="E-posta" value={form.email} onChange={(event) => updateForm('email', event.target.value)} required />
                  <TextField
                    label="Geçici şifre"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateForm('password', event.target.value)}
                    required
                  />
                  <TextField label="Personel no" value={form.employeeNumber} onChange={(event) => updateForm('employeeNumber', event.target.value)} />
                  <TextField label="T.C. / Kimlik no" value={form.identityNumber} onChange={(event) => updateForm('identityNumber', event.target.value)} />
                  <TextField label="Telefon" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
                  <TextField label="Pozisyon" value={form.jobTitle} onChange={(event) => updateForm('jobTitle', event.target.value)} />
                  <TextField select label="Çalışma tipi" value={form.employmentType} onChange={(event) => updateForm('employmentType', event.target.value)}>
                    <MenuItem value="full_time">Tam zamanlı</MenuItem>
                    <MenuItem value="part_time">Yarı zamanlı</MenuItem>
                    <MenuItem value="contractor">Sözleşmeli</MenuItem>
                    <MenuItem value="intern">Stajyer</MenuItem>
                  </TextField>
                  <TextField
                    label="İşe giriş tarihi"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm('startDate', event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Doğum tarihi"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateForm('birthDate', event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField label="IBAN" value={form.bankIban} onChange={(event) => updateForm('bankIban', event.target.value)} />
                  <TextField
                    label="Maaş"
                    type="number"
                    value={form.salaryAmount}
                    onChange={(event) => updateForm('salaryAmount', event.target.value)}
                  />
                  <TextField select label="Para birimi" value={form.salaryCurrency} onChange={(event) => updateForm('salaryCurrency', event.target.value)}>
                    <MenuItem value="TRY">TRY</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </TextField>
                  <TextField select label="Maaş periyodu" value={form.salaryPeriod} onChange={(event) => updateForm('salaryPeriod', event.target.value)}>
                    <MenuItem value="monthly">Aylık</MenuItem>
                    <MenuItem value="hourly">Saatlik</MenuItem>
                    <MenuItem value="daily">Günlük</MenuItem>
                  </TextField>
                </Box>
                <TextField label="Adres" value={form.address} onChange={(event) => updateForm('address', event.target.value)} multiline minRows={2} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Acil durum kişisi"
                    value={form.emergencyContactName}
                    onChange={(event) => updateForm('emergencyContactName', event.target.value)}
                  />
                  <TextField
                    label="Acil durum telefonu"
                    value={form.emergencyContactPhone}
                    onChange={(event) => updateForm('emergencyContactPhone', event.target.value)}
                  />
                </Box>
                {message && (
                  <Typography color={message.includes('oluşturuldu') ? 'success.main' : 'error'}>{message}</Typography>
                )}
                <Button type="submit" variant="contained">
                  Personel Oluştur
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', alignSelf: 'start' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Özlük Dosyaları
                  </Typography>
                  <Typography color="text.secondary">{files.length} kayıtlı personel</Typography>
                </Box>
                <Button variant="outlined" onClick={() => loadFiles().catch(() => setMessage('Özlük dosyaları getirilemedi. Tekrar giriş yapın.'))}>
                  Yenile
                </Button>
              </Box>
              <Stack spacing={1} sx={{ maxHeight: 640, overflowY: 'auto', pr: 1 }}>
                {files.map((file) => (
                  <Box
                    key={file.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr auto' },
                      gap: 1,
                      alignItems: 'center',
                      p: 1.25,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{file.jobTitle || 'Pozisyon girilmemiş'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        No: {file.employeeNumber || '-'} · Tel: {file.phone || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Çalışma: {file.employmentType || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Başlangıç: {file.startDate || '-'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={file.salaryAmount ? `${file.salaryAmount} ${file.salaryCurrency} / ${file.salaryPeriod}` : 'Maaş yok'}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Stack>
              {!files.length && <Typography color="text.secondary">Henüz personel özlük dosyası yok.</Typography>}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </AppShell>
  );
}
