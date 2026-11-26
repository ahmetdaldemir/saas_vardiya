'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

type AttendanceStatus = 'shift_start' | 'shift_end' | 'break_start' | 'break_end';

type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: AttendanceStatus;
  occurredAt: string;
  breakMinutes?: number;
  exceededBreakLimit?: boolean;
  note?: string;
};

type RuleProfile = {
  breakLimitMinutes?: number;
};

const RULE_STORAGE_PREFIX = 'smartshift.rules';

const statusLabels: Record<AttendanceStatus, string> = {
  shift_start: 'İşe başladı',
  break_start: 'Molaya çıktı',
  break_end: 'Moladan döndü',
  shift_end: 'Vardiyayı bitirdi',
};

const formatTime = (value?: string) => (value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-');

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [breakLimitMinutes, setBreakLimitMinutes] = useState(45);
  const [message, setMessage] = useState('');
  const user = getCurrentUser();
  const canManage = Boolean(user?.permissions.includes('requests.read') || user?.permissions.includes('users.read'));

  const loadRecords = async () => {
    const token = getAccessToken();
    const path = canManage ? '/attendance' : '/attendance/mine';
    const rows = await apiGet<AttendanceRecord[]>(path, token ?? undefined);
    setRecords(rows);
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    const resolvedTenantSlug = currentUser?.tenantSlug ?? 'demo';
    const savedRules = localStorage.getItem(`${RULE_STORAGE_PREFIX}.${resolvedTenantSlug}`);
    if (savedRules) {
      try {
        const profile = JSON.parse(savedRules) as RuleProfile;
        setBreakLimitMinutes(profile.breakLimitMinutes ?? 45);
      } catch {
        localStorage.removeItem(`${RULE_STORAGE_PREFIX}.${resolvedTenantSlug}`);
      }
    }
    loadRecords().catch(() => setMessage('Mesai kayıtları getirilemedi. Oturum veya API bağlantısını kontrol edin.'));
  }, []);

  const visibleRecords = useMemo(
    () => (canManage ? records : records.filter((record) => record.employeeId === user?.id)),
    [canManage, records, user?.id],
  );
  const lastShiftStart = records.find((record) => record.employeeId === user?.id && record.type === 'shift_start');
  const lastShiftEnd = records.find((record) => record.employeeId === user?.id && record.type === 'shift_end');
  const lastBreakStart = records.find((record) => record.employeeId === user?.id && record.type === 'break_start');
  const lastBreakEnd = records.find((record) => record.employeeId === user?.id && record.type === 'break_end');
  const activeShift = Boolean(lastShiftStart && (!lastShiftEnd || new Date(lastShiftStart.occurredAt) > new Date(lastShiftEnd.occurredAt)));
  const activeBreak = Boolean(lastBreakStart && (!lastBreakEnd || new Date(lastBreakStart.occurredAt) > new Date(lastBreakEnd.occurredAt)));
  const managerAlerts = records.filter((record) => record.exceededBreakLimit);

  const postAttendance = async (path: string, successMessage: string, body: Record<string, unknown> = {}) => {
    try {
      const token = getAccessToken();
      await apiPost(path, body, token ?? undefined);
      await loadRecords();
      setMessage(successMessage);
    } catch {
      setMessage('İşlem yapılamadı. Aktif vardiya/mola durumunu veya oturumu kontrol edin.');
    }
  };

  const startShift = () => {
    if (activeShift) {
      setMessage('Aktif işe başlama bildiriminiz zaten var.');
      return;
    }
    postAttendance('/attendance/shift-start', 'İşe başlama bildirimi kaydedildi.');
  };

  const endShift = () => {
    if (!activeShift) {
      setMessage('Bitirilecek aktif vardiya bulunamadı.');
      return;
    }
    postAttendance('/attendance/shift-end', 'Vardiya bitiş bildirimi kaydedildi.');
  };

  const startBreak = () => {
    if (!activeShift) {
      setMessage('Molaya çıkmak için önce işe başlama bildirimi yapmalısınız.');
      return;
    }
    if (activeBreak) {
      setMessage('Aktif mola bildiriminiz zaten var.');
      return;
    }
    postAttendance('/attendance/break-start', 'Molaya çıkış bildirimi kaydedildi.');
  };

  const endBreak = () => {
    if (!activeBreak) {
      setMessage('Bitirilecek aktif mola bulunamadı.');
      return;
    }
    postAttendance('/attendance/break-end', 'Moladan dönüş bildirimi kaydedildi. Limit aşımı varsa yönetici ekranına düşer.', {
      breakLimitMinutes,
    });
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Mesai Bildirimleri
          </Typography>
          <Typography color="text.secondary">
            Personel işe başlama, vardiya bitişi ve mola bildirimlerini buradan yapar. Mola limiti: {breakLimitMinutes} dakika.
          </Typography>
        </Box>

        {message && (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: message.includes('aşıldı') ? 'warning.main' : 'success.main' }}>
            <CardContent>
              <Typography color={message.includes('aşıldı') ? 'warning.main' : 'success.main'}>{message}</Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: canManage ? '1fr 1fr' : '5fr 7fr' }, gap: 2 }}>
          {!canManage && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Personel İşlemleri
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Güvenlik nedeniyle bu işlemler yalnızca mobil uygulamadan ve tanımlı işyeri IP adresinden yapılabilir.
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={startShift} disabled={activeShift}>
                    İşe Başlama Bildir
                  </Button>
                  <Button variant="outlined" onClick={startBreak} disabled={!activeShift || activeBreak}>
                    Molaya Çıkış Bildir
                  </Button>
                  <Button variant="outlined" onClick={endBreak} disabled={!activeBreak}>
                    Moladan Dönüş Bildir
                  </Button>
                  <Button variant="contained" color="secondary" onClick={endShift} disabled={!activeShift}>
                    Vardiya Bitiş Bildir
                  </Button>
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Chip label={activeShift ? 'Vardiya aktif' : 'Vardiya kapalı'} color={activeShift ? 'success' : 'default'} size="small" />
                  <Chip label={activeBreak ? 'Molada' : 'Molada değil'} color={activeBreak ? 'warning' : 'default'} size="small" sx={{ ml: 1 }} />
                </Box>
              </CardContent>
            </Card>
          )}

          {canManage && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Yönetici Bildirimleri
                </Typography>
                <Stack spacing={1} sx={{ mt: 2, maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                  {managerAlerts.map((alert) => (
                    <Box key={alert.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'warning.main', borderRadius: 2 }}>
                      <Typography sx={{ fontWeight: 700 }}>{alert.employeeName}</Typography>
                      <Typography color="text.secondary" variant="body2">{alert.note}</Typography>
                      <Chip label="Mola aşımı" color="warning" size="small" sx={{ mt: 1 }} />
                    </Box>
                  ))}
                  {!managerAlerts.length && <Typography color="text.secondary">Aktif yönetici bildirimi yok.</Typography>}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Bildirim Geçmişi
              </Typography>
              <Stack spacing={1} sx={{ mt: 2, maxHeight: 520, overflowY: 'auto', pr: 1 }}>
                {visibleRecords.map((record) => (
                  <Box key={record.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{record.employeeName}</Typography>
                      <Chip size="small" label={statusLabels[record.type]} color={record.exceededBreakLimit ? 'warning' : 'primary'} />
                    </Box>
                    <Typography color="text.secondary" variant="body2">Zaman: {formatTime(record.occurredAt)}</Typography>
                    {record.breakMinutes !== undefined && <Typography color="text.secondary" variant="body2">Mola: {record.breakMinutes} dk</Typography>}
                    {record.note && <Typography color="text.secondary" variant="body2">{record.note}</Typography>}
                  </Box>
                ))}
                {!visibleRecords.length && <Typography color="text.secondary">Henüz bildirim yok.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </AppShell>
  );
}
