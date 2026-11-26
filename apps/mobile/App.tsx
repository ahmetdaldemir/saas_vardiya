import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } };

const API_URL = process.env?.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type SessionUser = {
  id: string;
  tenantSlug: string;
  tenantName: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
};

type LoginResponse = {
  accessToken: string;
  user: SessionUser;
};

type AttendanceEvent = {
  id: string;
  employeeName: string;
  type: 'shift_start' | 'shift_end' | 'break_start' | 'break_end';
  occurredAt: string;
  breakMinutes?: number;
  exceededBreakLimit?: boolean;
  note?: string;
};

type EmployeeRequest = {
  id: string;
  type: string;
  title: string;
  status: string;
};

const attendanceLabels: Record<AttendanceEvent['type'], string> = {
  shift_start: 'İşe başladı',
  shift_end: 'Vardiya bitirdi',
  break_start: 'Molaya çıktı',
  break_end: 'Moladan döndü',
};

export default function App() {
  const [tenantSlug, setTenantSlug] = useState('test1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Personel123!');
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [requestTitle, setRequestTitle] = useState('İzin talebi');
  const [requestDescription, setRequestDescription] = useState('');
  const [preferredDates, setPreferredDates] = useState('');
  const [message, setMessage] = useState('');

  const activeShift = useMemo(() => {
    const start = attendance.find((event) => event.type === 'shift_start');
    const end = attendance.find((event) => event.type === 'shift_end');
    return Boolean(start && (!end || new Date(start.occurredAt) > new Date(end.occurredAt)));
  }, [attendance]);

  const activeBreak = useMemo(() => {
    const start = attendance.find((event) => event.type === 'break_start');
    const end = attendance.find((event) => event.type === 'break_end');
    return Boolean(start && (!end || new Date(start.occurredAt) > new Date(end.occurredAt)));
  }, [attendance]);

  const apiRequest = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    return response.json();
  };

  const loadMobileData = async (nextSession = session) => {
    if (!nextSession) return;
    const [attendanceRows, requestRows] = await Promise.all([
      fetch(`${API_URL}/api/attendance/mine`, {
        headers: { Authorization: `Bearer ${nextSession.accessToken}`, 'X-Client-Type': 'mobile' },
      }).then((response) => response.json()),
      fetch(`${API_URL}/api/employee-requests/mine`, {
        headers: { Authorization: `Bearer ${nextSession.accessToken}`, 'X-Client-Type': 'mobile' },
      }).then((response) => response.json()),
    ]);
    setAttendance(attendanceRows);
    setRequests(requestRows);
  };

  const login = async () => {
    try {
      const result = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'mobile' },
        body: JSON.stringify({ tenantSlug, email, password }),
      });

      if (!result.ok) {
        throw new Error('Login failed');
      }

      const nextSession = (await result.json()) as LoginResponse;
      setSession(nextSession);
      setMessage(`Hoş geldiniz ${nextSession.user.firstName}`);
      await loadMobileData(nextSession);
    } catch {
      Alert.alert('Giriş başarısız', 'Tenant, e-posta veya şifreyi kontrol edin.');
    }
  };

  const postAttendance = async (path: string, successMessage: string) => {
    try {
      await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(path.includes('break-end') ? { breakLimitMinutes: 45 } : {}),
      });
      await loadMobileData();
      setMessage(successMessage);
    } catch {
      Alert.alert('İşlem yapılamadı', 'Aktif vardiya/mola durumunu kontrol edin.');
    }
  };

  const createLeaveRequest = async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      await apiRequest('/employee-requests', {
        method: 'POST',
        body: JSON.stringify({
          type: 'leave',
          title: requestTitle,
          description: requestDescription,
          startsAt: now.toISOString(),
          endsAt: tomorrow.toISOString(),
          metadata: {},
        }),
      });
      setRequestDescription('');
      await loadMobileData();
      setMessage('Talep gönderildi.');
    } catch {
      Alert.alert('Talep gönderilemedi', 'Zorunlu alanları veya oturumu kontrol edin.');
    }
  };

  const createWorkPreference = async () => {
    try {
      await apiRequest('/employee-requests', {
        method: 'POST',
        body: JSON.stringify({
          type: 'work_preference',
          title: 'Mobil çalışma tercihi',
          description: 'Mobil uygulamadan gönderildi',
          metadata: {
            preferredDates: preferredDates.split(',').map((date) => date.trim()).filter(Boolean),
            avoidDates: [],
            model: 'mobile_preference_bidding',
          },
        }),
      });
      setPreferredDates('');
      await loadMobileData();
      setMessage('Çalışma tercihi gönderildi.');
    } catch {
      Alert.alert('Tercih gönderilemedi', 'En az bir tarih girin. Örnek: 2026-05-04');
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>SmartShift AI</Text>
          <Text style={styles.subtitle}>Personel Mobil Giriş</Text>
          <TextInput style={styles.input} placeholder="Tenant slug" value={tenantSlug} onChangeText={setTenantSlug} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={styles.primaryButton} onPress={login}>
            <Text style={styles.buttonText}>Giriş Yap</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Personel Paneli</Text>
            <Text style={styles.subtitle}>{session.user.firstName} {session.user.lastName} · {session.user.tenantName}</Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={() => setSession(null)}>
            <Text>Çıkış</Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mesai Bildirimleri</Text>
          <View style={styles.statusRow}>
            <Text style={styles.badge}>{activeShift ? 'Vardiya aktif' : 'Vardiya kapalı'}</Text>
            <Text style={styles.badge}>{activeBreak ? 'Molada' : 'Molada değil'}</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => postAttendance('/attendance/shift-start', 'İşe başlama bildirildi.')}>
            <Text style={styles.buttonText}>İşe Başlama Bildir</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => postAttendance('/attendance/break-start', 'Molaya çıkış bildirildi.')}>
            <Text>Molaya Çıkış Bildir</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => postAttendance('/attendance/break-end', 'Moladan dönüş bildirildi.')}>
            <Text>Moladan Dönüş Bildir</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={() => postAttendance('/attendance/shift-end', 'Vardiya bitiş bildirildi.')}>
            <Text style={styles.buttonText}>Vardiya Bitiş Bildir</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Talep Gönder</Text>
          <TextInput style={styles.input} value={requestTitle} onChangeText={setRequestTitle} placeholder="Talep başlığı" />
          <TextInput style={styles.input} value={requestDescription} onChangeText={setRequestDescription} placeholder="Açıklama" />
          <Pressable style={styles.primaryButton} onPress={createLeaveRequest}>
            <Text style={styles.buttonText}>İzin Talebi Gönder</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Çalışma Tercihi</Text>
          <TextInput
            style={styles.input}
            value={preferredDates}
            onChangeText={setPreferredDates}
            placeholder="2026-05-04, 2026-05-08"
          />
          <Pressable style={styles.primaryButton} onPress={createWorkPreference}>
            <Text style={styles.buttonText}>Tercih Gönder</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Son Mesai Kayıtları</Text>
          {attendance.slice(0, 8).map((event) => (
            <Text key={event.id} style={styles.listItem}>
              {attendanceLabels[event.type]} · {new Date(event.occurredAt).toLocaleString('tr-TR')} {event.note ? `· ${event.note}` : ''}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Taleplerim</Text>
          {requests.slice(0, 8).map((request) => (
            <Text key={request.id} style={styles.listItem}>{request.title} · {request.status}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 18, gap: 14 },
  loginCard: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  primaryButton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#e0f2fe', padding: 14, borderRadius: 12, alignItems: 'center' },
  dangerButton: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 12, alignItems: 'center' },
  ghostButton: { backgroundColor: '#e2e8f0', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  success: { color: '#15803d', backgroundColor: '#dcfce7', padding: 12, borderRadius: 12 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { backgroundColor: '#eef2ff', color: '#3730a3', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  listItem: { color: '#334155', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
});
