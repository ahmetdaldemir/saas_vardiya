'use client';

import { login } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [email, setEmail] = useState('admin@smartshift.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await login({ tenantSlug, email, password });
      saveSession(session);
      router.replace('/');
    } catch {
      setError('Giriş başarısız. Firma kodu, e-posta veya şifreyi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #0f172a, #1d4ed8)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent>
          <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                SmartShift AI
              </Typography>
              <Typography color="text.secondary">Platform, firma veya personel paneline giriş yapın.</Typography>
            </Box>

            <TextField label="Firma kodu" value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} fullWidth />
            <TextField label="E-posta" value={email} onChange={(event) => setEmail(event.target.value)} fullWidth />
            <TextField
              label="Şifre"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />

            {error && <Typography color="error">{error}</Typography>}

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
