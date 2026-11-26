'use client';

import { AppShell } from '@/components/app-shell';
import { apiPatch } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

type RuleProfile = {
  prompt: string;
  hardRules: string[];
  softRules: string[];
  advisoryRules: string[];
  maxWeeklyDutyDays: number;
  breakLimitMinutes: number;
  enforceAttendanceIp: boolean;
  allowedAttendanceIps: string;
  allowNightAfterNight: boolean;
  requireManagerApproval: boolean;
  features: {
    aiPlanning: boolean;
    strictRestCheck: boolean;
    auditRequired: boolean;
  };
  audit: string[];
};

const defaultPrompt = `Hastanemizde hemşireler haftada en fazla 5 gün çalışır.
Arka arkaya iki gece nöbeti verilmemeli.
Acil ve yoğun bakım birimlerinde minimum kapsama korunmalı.
Rapor veya izin durumunda yedek personel atanmalı.
On-call nöbetler yönetici onayı gerektirir.`;

const defaultProfile: RuleProfile = {
  prompt: defaultPrompt,
  hardRules: [],
  softRules: [],
  advisoryRules: [],
  maxWeeklyDutyDays: 5,
  breakLimitMinutes: 45,
  enforceAttendanceIp: false,
  allowedAttendanceIps: '',
  allowNightAfterNight: false,
  requireManagerApproval: true,
  features: {
    aiPlanning: true,
    strictRestCheck: true,
    auditRequired: true,
  },
  audit: [],
};

const RULE_STORAGE_PREFIX = 'smartshift.rules';

export default function RulesPage() {
  const [storageKey, setStorageKey] = useState('');
  const [profile, setProfile] = useState<RuleProfile>(defaultProfile);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    const key = `${RULE_STORAGE_PREFIX}.${currentUser?.tenantSlug ?? 'demo'}`;
    setStorageKey(key);
    const saved = localStorage.getItem(key);
    if (!saved) return;

    try {
      setProfile({ ...defaultProfile, ...(JSON.parse(saved) as RuleProfile) });
    } catch {
      localStorage.removeItem(key);
    }
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(profile));
  }, [profile, storageKey]);

  const writeAudit = (text: string) => {
    const stamp = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    setProfile((current) => ({ ...current, audit: [`${stamp} - ${text}`, ...current.audit].slice(0, 25) }));
  };

  const analyzePrompt = () => {
    const text = profile.prompt.toLocaleLowerCase('tr-TR');
    const maxDayMatch = text.match(/haftada en fazla\s+(\d+)/);
    const breakMatch = text.match(/mola(?:\s+süresi)?(?:\s+en fazla)?\s+(\d+)/);
    const maxWeeklyDutyDays = maxDayMatch ? Number(maxDayMatch[1]) : profile.maxWeeklyDutyDays;
    const breakLimitMinutes = breakMatch ? Number(breakMatch[1]) : profile.breakLimitMinutes;
    const allowNightAfterNight = !(text.includes('arka arkaya iki gece') || text.includes('üst üste gece'));
    const requireManagerApproval = text.includes('onay') || text.includes('yönetici') || text.includes('sorumlu');

    const hardRules = [
      `Haftalık maksimum çalışma günü: ${maxWeeklyDutyDays}`,
      `Maksimum mola süresi: ${breakLimitMinutes} dakika`,
      allowNightAfterNight ? 'Gece sonrası gece nöbetine izin verilebilir' : 'Arka arkaya gece nöbeti engellenir',
      text.includes('minimum') || text.includes('kapsama') ? 'Minimum birim kapsaması korunur' : 'Birim kapsaması kontrol edilir',
    ];

    const softRules = [
      'Tercih bidding sonuçları mümkün olduğunda korunur',
      'Kötü vardiyalar personeller arasında adil dağıtılır',
      'Aynı personelin fazla mesai riski düşürülür',
    ];

    const advisoryRules = [
      requireManagerApproval ? 'On-call ve acil değişiklikler yönetici onayı ister' : 'Kritik değişiklikler planlayıcı uyarısı üretir',
      'Rapor/izin durumunda yedek personel önerilir',
    ];

    setProfile((current) => ({
      ...current,
      hardRules,
      softRules,
      advisoryRules,
      maxWeeklyDutyDays,
      breakLimitMinutes,
      allowNightAfterNight,
      requireManagerApproval,
      audit: [
        `${new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} - AI kural analizi çalıştırıldı`,
        ...current.audit,
      ].slice(0, 25),
    }));
    setMessage('Yazılı çalışma sistemi AI kural profiline dönüştürüldü.');
  };

  const updateFeature = (key: keyof RuleProfile['features'], checked: boolean) => {
    setProfile((current) => ({ ...current, features: { ...current.features, [key]: checked } }));
    writeAudit(`${key} özelliği ${checked ? 'aktif' : 'pasif'} yapıldı`);
  };

  const saveAttendanceSecurity = async () => {
    try {
      const token = getAccessToken();
      const allowedIps = profile.allowedAttendanceIps
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);
      await apiPatch('/feature-flags/attendance_security', {
        enabled: profile.enforceAttendanceIp,
        config: {
          enforceIp: profile.enforceAttendanceIp,
          allowedIps,
          breakLimitMinutes: profile.breakLimitMinutes,
        },
      }, token ?? undefined);
      writeAudit(`Mesai IP güvenliği ${profile.enforceAttendanceIp ? 'aktif' : 'pasif'} kaydedildi`);
      setMessage('Mesai IP güvenliği backend ayarlarına kaydedildi.');
    } catch {
      setMessage('Mesai IP güvenliği kaydedilemedi. Yetki veya oturum kontrolü yapın.');
    }
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Kurallar, Özellikler & Audit
          </Typography>
          <Typography color="text.secondary">
            Yönetici çalışma sistemini yazılı olarak tanımlar; AI bu metni çizelge kurallarına dönüştürür.
          </Typography>
        </Box>

        {message && (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'success.main' }}>
            <CardContent>
              <Typography color="success.main">{message}</Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 4fr 3fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                AI Çalışma Sistemi Promptu
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Hastanenin nöbet kurallarını doğal dille yazın. Sistem bunu sert kural, yumuşak kural ve uyarı kuralına ayırır.
              </Typography>
              <TextField
                value={profile.prompt}
                onChange={(event) => setProfile((current) => ({ ...current, prompt: event.target.value }))}
                multiline
                minRows={10}
                fullWidth
                sx={{ mt: 2 }}
              />
              <Button variant="contained" onClick={analyzePrompt} sx={{ mt: 2 }}>
                AI Kural Analizi Yap
              </Button>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Oluşturulan Kural Profili
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Sert Kurallar</Typography>
                  {profile.hardRules.map((rule) => <Chip key={rule} label={rule} color="error" size="small" sx={{ mr: 0.75, mt: 0.75 }} />)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Yumuşak Kurallar</Typography>
                  {profile.softRules.map((rule) => <Chip key={rule} label={rule} color="warning" size="small" sx={{ mr: 0.75, mt: 0.75 }} />)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Uyarı Kuralları</Typography>
                  {profile.advisoryRules.map((rule) => <Chip key={rule} label={rule} color="info" size="small" sx={{ mr: 0.75, mt: 0.75 }} />)}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Özellikler
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <TextField
                  label="Maksimum mola süresi (dakika)"
                  type="number"
                  value={profile.breakLimitMinutes}
                  onChange={(event) => {
                    const value = Number(event.target.value || 0);
                    setProfile((current) => ({
                      ...current,
                      breakLimitMinutes: value,
                      audit: [
                        `${new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} - Mola limiti ${value} dakika olarak güncellendi`,
                        ...current.audit,
                      ].slice(0, 25),
                    }));
                  }}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography>Mesai IP güvenliği</Typography>
                    <Typography variant="caption" color="text.secondary">
                      İşe giriş/çıkış ve mola sadece tanımlı işyeri IP adreslerinden yapılır.
                    </Typography>
                  </Box>
                  <Switch
                    checked={profile.enforceAttendanceIp}
                    onChange={(event) => setProfile((current) => ({ ...current, enforceAttendanceIp: event.target.checked }))}
                  />
                </Box>
                <TextField
                  label="İzinli işyeri IP adresleri"
                  helperText="Virgülle ayırın. Örnek: 192.168.1.20, 10.0.0.0/24"
                  value={profile.allowedAttendanceIps}
                  onChange={(event) => setProfile((current) => ({ ...current, allowedAttendanceIps: event.target.value }))}
                />
                <Button variant="outlined" onClick={saveAttendanceSecurity}>
                  Mesai Güvenliğini Kaydet
                </Button>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>AI planlama</Typography>
                  <Switch checked={profile.features.aiPlanning} onChange={(event) => updateFeature('aiPlanning', event.target.checked)} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Sıkı dinlenme kontrolü</Typography>
                  <Switch checked={profile.features.strictRestCheck} onChange={(event) => updateFeature('strictRestCheck', event.target.checked)} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Audit zorunlu</Typography>
                  <Switch checked={profile.features.auditRequired} onChange={(event) => updateFeature('auditRequired', event.target.checked)} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Audit Geçmişi
            </Typography>
            <Stack spacing={1} sx={{ mt: 2, maxHeight: 240, overflowY: 'auto' }}>
              {profile.audit.map((entry) => (
                <Typography key={entry} color="text.secondary">
                  {entry}
                </Typography>
              ))}
              {!profile.audit.length && <Typography color="text.secondary">Henüz audit kaydı yok.</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
