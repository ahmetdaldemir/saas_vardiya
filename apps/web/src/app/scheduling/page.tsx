'use client';

import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { Box, Button, Card, CardContent, Chip, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

const industryConfigs = {
  airline: {
    title: 'Havayolu Crew Planlama',
    subtitle: 'Uçuş görevi, pairing, line bidding, dinlenme ve legality kurallarına göre planlama.',
    createLabel: 'Uçuş / Pairing Oluştur',
    generateLabel: 'Crew Planı Üret',
    unassignedTitle: 'Açık Uçuş Görevleri',
    timelineTitle: 'Crew Pairing Timeline',
    inspectorTitle: 'Legality Kontrolü',
    primaryField: 'Uçuş No / Pairing',
    roleField: 'Crew Rolü',
    locationField: 'Base / Havalimanı',
    roles: ['Kaptan', 'First Officer', 'Kabin Memuru', 'Purser', 'Reserve Crew'],
    locations: ['IST Base', 'SAW Base', 'AYT Base', 'ESB Base'],
    shifts: [
      { role: 'Kaptan A320', time: 'IST 07:20 - FRA 10:10', location: 'IST Base', status: 'Açık', conflict: 'EASA dinlenme kontrolü' },
      { role: 'Kabin Ekibi', time: 'IST 13:00 - LHR 16:30', location: 'IST Base', status: 'Açık', conflict: 'Aircraft qualification' },
      { role: 'Reserve Crew', time: '18:00 - 02:00', location: 'SAW Base', status: 'Atandı', conflict: 'Fatigue warning' },
    ],
    lanes: ['Kaptanlar', 'First Officer', 'Kabin Ekibi', 'Reserve Pool'],
    rules: ['FAA/EASA duty limit', 'Minimum rest time', 'Aircraft type qualification', 'Seniority line bidding', 'Base return rule'],
  },
  hospital: {
    title: 'Hastane Nöbet Planlama',
    subtitle: 'Departman, klinik yetkinlik, on-call, acil kapsama ve hasta/personel oranına göre planlama.',
    createLabel: 'Nöbet / Vardiya Oluştur',
    generateLabel: 'Nöbet Planı Üret',
    unassignedTitle: 'Açık Nöbetler',
    timelineTitle: 'Departman Nöbet Timeline',
    inspectorTitle: 'Klinik Kural Kontrolü',
    primaryField: 'Nöbet Adı',
    roleField: 'Klinik Rol',
    locationField: 'Departman / Birim',
    roles: ['Doktor', 'Uzman Doktor', 'Hemşire', 'Charge Nurse', 'Teknisyen', 'On-call'],
    locations: ['Acil', 'Yoğun Bakım', 'Ameliyathane', 'Pediatri', 'Genel Servis'],
    shifts: [
      { role: 'Acil Doktoru', time: '08:00 - 20:00', location: 'Acil', status: 'Açık', conflict: 'Minimum coverage' },
      { role: 'ICU Hemşire', time: '20:00 - 08:00', location: 'Yoğun Bakım', status: 'Açık', conflict: 'ICU sertifika gerekli' },
      { role: 'On-call Uzman', time: '18:00 - 08:00', location: 'Cerrahi', status: 'Atandı', conflict: 'Rest after call' },
    ],
    lanes: ['Acil', 'Yoğun Bakım', 'Ameliyathane', 'On-call Havuzu'],
    rules: ['Hasta/personel oranı', 'Minimum dinlenme', 'Maksimum ardışık nöbet', 'Klinik sertifika', 'Acil kapsama'],
  },
  corporate: {
    title: 'Kurumsal Vardiya Planlama',
    subtitle: 'Departman, lokasyon, mesai, izin ve adil dağılım kurallarına göre standart vardiya planlama.',
    createLabel: 'Vardiya Oluştur',
    generateLabel: 'Otomatik Plan Üret',
    unassignedTitle: 'Açık Vardiyalar',
    timelineTitle: 'Ekip Timeline',
    inspectorTitle: 'Kural Kontrolü',
    primaryField: 'Vardiya Adı',
    roleField: 'Rol / Pozisyon',
    locationField: 'Lokasyon',
    roles: ['Operasyon', 'Destek', 'Güvenlik', 'Müşteri Hizmetleri', 'Takım Lideri'],
    locations: ['Merkez Ofis', 'Şube 1', 'Depo', 'Çağrı Merkezi'],
    shifts: [
      { role: 'Destek Ekibi', time: '09:00 - 17:00', location: 'Çağrı Merkezi', status: 'Açık', conflict: 'Adil hafta sonu dağılımı' },
      { role: 'Operasyon', time: '16:00 - 00:00', location: 'Depo', status: 'Açık', conflict: 'Fazla mesai riski' },
      { role: 'Takım Lideri', time: '08:00 - 16:00', location: 'Merkez Ofis', status: 'Atandı', conflict: 'Uygun' },
    ],
    lanes: ['Operasyon', 'Destek', 'Güvenlik', 'Yönetici Onayı'],
    rules: ['Maksimum haftalık saat', 'İzin çakışması', 'Fazla mesai', 'Adil kötü vardiya dağılımı', 'Rol uygunluğu'],
  },
};

type IndustryKey = keyof typeof industryConfigs;
type PlanningItem = {
  id: string;
  role: string;
  time: string;
  location: string;
  status: string;
  conflict: string;
  name?: string;
  lane?: string;
  assigneeId?: string;
  assigneeName?: string;
  dateKey?: string;
};

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

type SchedulePlan = {
  id: string;
  week: string;
  industry: IndustryKey;
  createdAt: string;
  items: PlanningItem[];
};

type RuleProfile = {
  hardRules?: string[];
  maxWeeklyDutyDays?: number;
  allowNightAfterNight?: boolean;
  requireManagerApproval?: boolean;
  features?: {
    aiPlanning?: boolean;
    strictRestCheck?: boolean;
    auditRequired?: boolean;
  };
};

const assignmentColors = [
  { bg: '#2563eb', soft: '#eff6ff' },
  { bg: '#16a34a', soft: '#f0fdf4' },
  { bg: '#9333ea', soft: '#faf5ff' },
  { bg: '#ea580c', soft: '#fff7ed' },
  { bg: '#0891b2', soft: '#ecfeff' },
  { bg: '#be123c', soft: '#fff1f2' },
  { bg: '#4f46e5', soft: '#eef2ff' },
  { bg: '#0f766e', soft: '#f0fdfa' },
];

const SCHEDULE_STORAGE_PREFIX = 'smartshift.schedule';
const RULE_STORAGE_PREFIX = 'smartshift.rules';

const dateKeyFor = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const getCurrentWeekValue = () => {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNumber = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const week = 1 + Math.round(((target.valueOf() - firstThursday.valueOf()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const weekDaysFromValue = (weekValue: string) => {
  if (!/^\d{4}-W\d{2}$/.test(weekValue)) {
    return weekDaysFromValue(getCurrentWeekValue());
  }

  const [yearPart, weekPart] = weekValue.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);
  const fourthOfJanuary = new Date(year, 0, 4);
  const weekOneMonday = new Date(fourthOfJanuary);
  weekOneMonday.setDate(fourthOfJanuary.getDate() - ((fourthOfJanuary.getDay() + 6) % 7));
  const monday = new Date(weekOneMonday);
  monday.setDate(weekOneMonday.getDate() + (week - 1) * 7);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: dateKeyFor(date),
      label: date.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    };
  });
};

const weekLabelFor = (weekValue: string) => {
  const days = weekDaysFromValue(weekValue);
  return `${weekValue.replace('-W', ' / ')} (${days[0]?.label} - ${days[6]?.label})`;
};

export default function SchedulingPage() {
  const [industry, setIndustry] = useState<IndustryKey>('corporate');
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planWeek, setPlanWeek] = useState(getCurrentWeekValue);
  const [draggedItemId, setDraggedItemId] = useState('');
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; itemId: string } | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [ruleProfile, setRuleProfile] = useState<RuleProfile | null>(null);
  const [storageKey, setStorageKey] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    const userIndustry = currentUser?.tenantIndustry as IndustryKey | undefined;
    const resolvedIndustry = userIndustry && industryConfigs[userIndustry] ? userIndustry : 'corporate';
    const tenantScheduleKey = `${SCHEDULE_STORAGE_PREFIX}.${currentUser?.tenantSlug ?? 'demo'}.${resolvedIndustry}.plans`;
    const legacyScheduleKey = `${SCHEDULE_STORAGE_PREFIX}.${currentUser?.tenantSlug ?? 'demo'}.${resolvedIndustry}`;
    const tenantRuleKey = `${RULE_STORAGE_PREFIX}.${currentUser?.tenantSlug ?? 'demo'}`;
    const savedPlans = localStorage.getItem(tenantScheduleKey);
    const legacyItems = !savedPlans ? localStorage.getItem(legacyScheduleKey) : null;
    const savedRuleProfile = localStorage.getItem(tenantRuleKey);

    setIndustry(resolvedIndustry);
    setStorageKey(tenantScheduleKey);

    if (savedRuleProfile) {
      try {
        setRuleProfile(JSON.parse(savedRuleProfile) as RuleProfile);
      } catch {
        localStorage.removeItem(tenantRuleKey);
      }
    }

    if (savedPlans) {
      try {
        const parsed = JSON.parse(savedPlans) as SchedulePlan[] | PlanningItem[];
        if (Array.isArray(parsed) && parsed[0] && 'week' in parsed[0]) {
          const restoredPlans = parsed as SchedulePlan[];
          setPlans(restoredPlans);
          setSelectedPlanId(restoredPlans[0]?.id ?? '');
          setPlanWeek(restoredPlans[0]?.week ?? getCurrentWeekValue());
          setItems(restoredPlans[0]?.items ?? []);
        }
      } catch {
        localStorage.removeItem(tenantScheduleKey);
      }
    } else if (legacyItems) {
      try {
        const restoredItems = JSON.parse(legacyItems) as PlanningItem[];
        const migratedPlan: SchedulePlan = {
          id: `plan-${resolvedIndustry}-${getCurrentWeekValue()}-legacy`,
          week: getCurrentWeekValue(),
          industry: resolvedIndustry,
          createdAt: new Date().toISOString(),
          items: restoredItems,
        };
        setPlans([migratedPlan]);
        setSelectedPlanId(migratedPlan.id);
        setPlanWeek(migratedPlan.week);
        setItems(migratedPlan.items);
        localStorage.removeItem(legacyScheduleKey);
      } catch {
        localStorage.removeItem(legacyScheduleKey);
      }
    }

    const token = getAccessToken();
    Promise.all([
      apiGet<Personnel[]>('/users', token ?? undefined),
      apiGet<PersonnelFile[]>('/employees/personnel-files', token ?? undefined).catch(() => []),
    ])
      .then(([rows, profiles]) => {
        const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
        setPersonnel(
          rows
            .filter((user) => user.userType === 'employee')
            .map((user) => ({
              ...user,
              jobTitle: profileByUserId.get(user.id)?.jobTitle,
            })),
        );
      })
      .catch(() => setMessage('Personel listesi getirilemedi. Tekrar giriş yapın veya yetkinizi kontrol edin.'));
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(plans));
  }, [plans, storageKey]);

  const config = industryConfigs[industry];
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId), [plans, selectedPlanId]);
  const selectedContextItem = useMemo(
    () => items.find((item) => item.id === contextMenu?.itemId),
    [contextMenu?.itemId, items],
  );
  const assignedItems = useMemo(() => items.filter((shift) => shift.status === 'Atandı'), [items]);
  const calendarDays = useMemo(() => weekDaysFromValue(selectedPlan?.week ?? planWeek), [planWeek, selectedPlan?.week]);
  const visiblePersonnel = personnel;

  const shiftHoursFor = (employeeIndex: number, dayIndex: number) => {
    if (industry === 'hospital') {
      return (employeeIndex + dayIndex) % 2 === 0 ? '08:00 - 20:00' : '20:00 - 08:00';
    }

    if (industry === 'airline') {
      return (employeeIndex + dayIndex) % 2 === 0 ? '07:20 - 15:10' : '14:30 - 22:40';
    }

    return (employeeIndex + dayIndex) % 2 === 0 ? '09:00 - 17:00' : '16:00 - 00:00';
  };

  const personnelRoleFor = (employee: Personnel, employeeIndex: number) => employee.jobTitle || config.roles[employeeIndex % config.roles.length];

  const employeeColor = (employeeId: string) => {
    const index = personnel.findIndex((employee) => employee.id === employeeId);
    return assignmentColors[Math.max(index, 0) % assignmentColors.length];
  };

  const selectPlan = (plan: SchedulePlan) => {
    setSelectedPlanId(plan.id);
    setPlanWeek(plan.week);
    setItems(plan.items);
    setMessage(`${weekLabelFor(plan.week)} planı görüntüleniyor.`);
  };

  const generatePlan = () => {
    if (!planWeek) {
      setMessage('Plan üretmek için önce hafta seçin.');
      return;
    }

    const existingPlan = plans.find((plan) => plan.week === planWeek);
    if (existingPlan) {
      selectPlan(existingPlan);
      setMessage(`${weekLabelFor(planWeek)} için daha önce plan oluşturulmuş. Aynı haftaya ikinci plan üretilmedi.`);
      return;
    }

    if (!personnel.length) {
      setMessage('Plan üretmek için kayıtlı personel bulunamadı. Önce Personeller ekranından personel oluşturun.');
      return;
    }

    const planDays = weekDaysFromValue(planWeek);
    const maxWeeklyDutyDays = ruleProfile?.maxWeeklyDutyDays ?? 4;
    const generatedRoster: PlanningItem[] = personnel.flatMap((employee, employeeIndex) =>
      planDays
        .filter((_, dayIndex) => (employeeIndex + dayIndex) % 2 === 0 || (industry === 'hospital' && dayIndex % 3 === 0))
        .slice(0, maxWeeklyDutyDays)
        .map((day, assignmentIndex) => {
          const employeeRole = personnelRoleFor(employee, employeeIndex);
          return {
            id: `roster-${employee.id}-${day.key}`,
            name: employeeRole,
            role: employeeRole,
            time: shiftHoursFor(employeeIndex, assignmentIndex),
            location: config.locations[employeeIndex % config.locations.length],
            status: 'Atandı',
            conflict: ruleProfile?.requireManagerApproval && (employeeIndex + assignmentIndex) % 11 === 0 ? 'AI kuralı: yönetici onayı önerilir' : 'Uygun',
            lane: config.lanes[employeeIndex % config.lanes.length],
            assigneeId: employee.id,
            assigneeName: `${employee.firstName} ${employee.lastName}`,
            dateKey: day.key,
          };
        }),
    );

    const newPlan: SchedulePlan = {
      id: `plan-${industry}-${planWeek}-${Date.now()}`,
      week: planWeek,
      industry,
      createdAt: new Date().toISOString(),
      items: generatedRoster,
    };
    setPlans((current) => [newPlan, ...current]);
    setSelectedPlanId(newPlan.id);
    setItems(generatedRoster);
    setMessage(`${weekLabelFor(planWeek)} için ${personnel.length} personellik nöbet çizelgesi oluşturuldu.`);
  };

  const updateCurrentPlanItems = (updatedItems: PlanningItem[]) => {
    setItems(updatedItems);
    setPlans((current) => current.map((plan) => (plan.id === selectedPlanId ? { ...plan, items: updatedItems } : plan)));
  };

  const moveAssignment = (targetEmployee: Personnel, targetEmployeeIndex: number, targetDateKey: string) => {
    if (!draggedItemId || !selectedPlanId) return;

    const draggedItem = items.find((item) => item.id === draggedItemId);
    if (!draggedItem) return;

    const sourceEmployee = personnel.find((employee) => employee.id === draggedItem.assigneeId);
    const targetEmployeeRole = personnelRoleFor(targetEmployee, targetEmployeeIndex);
    const targetCellItem = items.find(
      (item) => item.id !== draggedItemId && item.assigneeId === targetEmployee.id && item.dateKey === targetDateKey,
    );
    const updatedItems = items.map((item) => {
      if (item.id === draggedItemId) {
        return {
          ...item,
          assigneeId: targetEmployee.id,
          assigneeName: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
          dateKey: targetDateKey,
          name: targetEmployeeRole,
          role: targetEmployeeRole,
        };
      }

      if (targetCellItem && item.id === targetCellItem.id && sourceEmployee && draggedItem.assigneeId && draggedItem.dateKey) {
        const sourceEmployeeIndex = personnel.findIndex((employee) => employee.id === draggedItem.assigneeId);
        const sourceEmployeeRole = personnelRoleFor(sourceEmployee, Math.max(sourceEmployeeIndex, 0));
        return {
          ...item,
          assigneeId: draggedItem.assigneeId,
          assigneeName: draggedItem.assigneeName,
          dateKey: draggedItem.dateKey,
          name: sourceEmployeeRole,
          role: sourceEmployeeRole,
        };
      }

      return item;
    });

    updateCurrentPlanItems(updatedItems);
    setDraggedItemId('');
    setMessage(`${targetEmployee.firstName} ${targetEmployee.lastName} için plan güncellendi ve kaydedildi.`);
  };

  const updateContextItem = (updater: (item: PlanningItem) => PlanningItem, successMessage: string) => {
    if (!selectedContextItem) return;
    updateCurrentPlanItems(items.map((item) => (item.id === selectedContextItem.id ? updater(item) : item)));
    setContextMenu(null);
    setMessage(successMessage);
  };

  const assignReserveStaff = () => {
    if (!selectedContextItem?.dateKey) return;

    const currentIndex = personnel.findIndex((employee) => employee.id === selectedContextItem.assigneeId);
    const reserveEmployee = personnel.find((employee, index) => index > currentIndex && employee.id !== selectedContextItem.assigneeId) ?? personnel[0];
    if (!reserveEmployee) return;

    const reserveIndex = personnel.findIndex((employee) => employee.id === reserveEmployee.id);
    const reserveRole = personnelRoleFor(reserveEmployee, Math.max(reserveIndex, 0));
    updateContextItem(
      (item) => ({
        ...item,
        assigneeId: reserveEmployee.id,
        assigneeName: `${reserveEmployee.firstName} ${reserveEmployee.lastName}`,
        name: reserveRole,
        role: reserveRole,
        conflict: 'Yedek personel atandı - sorumlu onayı',
      }),
      `${reserveEmployee.firstName} ${reserveEmployee.lastName} yedek personel olarak atandı.`,
    );
  };

  const clearContextAssignment = () => {
    if (!selectedContextItem) return;
    updateCurrentPlanItems(
      items.map((item) =>
        item.id === selectedContextItem.id
          ? {
              ...item,
              status: 'Açık',
              assigneeId: undefined,
              assigneeName: undefined,
              dateKey: undefined,
              conflict: 'Boş nöbet - yeniden atama gerekli',
            }
          : item,
      ),
    );
    setContextMenu(null);
    setMessage('Nöbet boşaltıldı. Yeniden atama yapılmalı.');
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {config.title}
            </Typography>
            <Typography color="text.secondary">
              {config.subtitle}
            </Typography>
            <Chip label={`Sektör: ${industry}`} color="primary" size="small" sx={{ mt: 1 }} />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField
              label="Plan haftası"
              type="week"
              value={planWeek}
              onChange={(event) => setPlanWeek(event.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button variant="contained" onClick={generatePlan}>
              Haftalık Plan Üret
            </Button>
          </Stack>
        </Box>

        {message && (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: message.includes('Lütfen') ? 'error.main' : 'success.main' }}>
            <CardContent>
              <Typography color={message.includes('Lütfen') ? 'error' : 'success.main'}>{message}</Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 6fr 3fr' }, gap: 2 }}>
          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 520 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Planlar
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Geçmiş ve mevcut haftalık planlar.
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 2, maxHeight: 650, overflowY: 'auto', pr: 1 }}>
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      variant="outlined"
                      onClick={() => selectPlan(plan)}
                      sx={{
                        cursor: 'pointer',
                        borderColor: plan.id === selectedPlanId ? 'primary.main' : 'divider',
                        bgcolor: plan.id === selectedPlanId ? 'action.selected' : 'background.paper',
                        transition: '150ms ease',
                        '&:hover': { borderColor: 'primary.main', boxShadow: 2, transform: 'translateY(-1px)' },
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography sx={{ fontWeight: 700 }}>{weekLabelFor(plan.week)}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {plan.items.length} görev · {new Date(plan.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </Typography>
                        {plan.id === selectedPlanId && <Chip label="Açık" size="small" color="primary" sx={{ mt: 1 }} />}
                      </CardContent>
                    </Card>
                  ))}
                  {!plans.length && (
                    <Typography color="text.secondary">
                      Henüz plan yok. Hafta seçip "Haftalık Plan Üret" butonuna basın.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 520 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Haftalık Vardiya Çizelgesi
                    </Typography>
                    <Typography color="text.secondary">
                      Tüm personel, çalıştığı gün ve saat bilgisiyle haftalık çizelgede listelenir.
                    </Typography>
                  </Box>
                  <Chip label={`${visiblePersonnel.length} personel`} color="primary" size="small" />
                </Box>

                <Box sx={{ mt: 2, maxHeight: 720, overflow: 'auto' }}>
                  <Box
                    sx={{
                      minWidth: 980,
                      display: 'grid',
                      gridTemplateColumns: '180px repeat(7, minmax(120px, 1fr))',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRight: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontWeight: 700 }}>Personel</Typography>
                    </Box>
                    {calendarDays.map((day) => (
                      <Box key={day.key} sx={{ p: 1.5, bgcolor: 'grey.100', borderRight: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontWeight: 700 }}>{day.label}</Typography>
                      </Box>
                    ))}

                    {visiblePersonnel.map((employee, employeeIndex) => {
                      const employeeRole = personnelRoleFor(employee, employeeIndex);
                      return (
                      <Box key={employee.id} sx={{ display: 'contents' }}>
                        <Box sx={{ p: 1.5, borderTop: '1px solid', borderRight: '1px solid', borderColor: 'divider' }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {employee.firstName} {employee.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.email}
                          </Typography>
                          <Chip label={employeeRole} size="small" variant="outlined" sx={{ display: 'flex', mt: 1, width: 'fit-content' }} />
                        </Box>
                        {calendarDays.map((day) => {
                          const cellItems = assignedItems.filter((item) => item.assigneeId === employee.id && item.dateKey === day.key);
                          const color = employeeColor(employee.id);
                          return (
                            <Box
                              key={`${employee.id}-${day.key}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => moveAssignment(employee, employeeIndex, day.key)}
                              sx={{
                                minHeight: 86,
                                p: 1,
                                borderTop: '1px solid',
                                borderRight: '1px solid',
                                borderColor: 'divider',
                                bgcolor: cellItems.length ? color.soft : 'background.paper',
                                boxShadow: cellItems.length ? `inset 4px 0 0 ${color.bg}` : 'none',
                              }}
                            >
                              {cellItems.length ? (
                                <Stack spacing={0.75}>
                                  {cellItems.map((item) => (
                                    <Box
                                      key={item.id}
                                      draggable
                                      onContextMenu={(event) => {
                                        event.preventDefault();
                                        setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, itemId: item.id });
                                      }}
                                      onDragStart={(event) => {
                                        event.dataTransfer.setData('text/plain', item.id);
                                        setDraggedItemId(item.id);
                                      }}
                                      onDragEnd={() => setDraggedItemId('')}
                                      sx={{
                                        p: 1,
                                        borderRadius: 1.5,
                                        bgcolor: color.bg,
                                        color: '#fff',
                                        cursor: 'grab',
                                        '&:active': { cursor: 'grabbing' },
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                        {employeeRole}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                                        {item.time}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                                        {item.location}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
                                        {item.conflict}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  Boş
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                      );
                    })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 520 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {config.inspectorTitle}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Sert kurallar atamayı engeller. Uyarı kuralları yönetici onayıyla ilerleyebilir.
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>Plan Özeti</Typography>
                  <Typography color="text.secondary">Seçili hafta: {selectedPlan ? weekLabelFor(selectedPlan.week) : weekLabelFor(planWeek)}</Typography>
                  <Typography color="text.secondary">Kayıtlı plan: {plans.length}</Typography>
                  <Typography color="text.secondary">Atanan kayıt: {assignedItems.length}</Typography>
                  <Typography color="text.secondary">Yüklü personel: {personnel.length}</Typography>
                </Box>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>AI Kural Profili</Typography>
                  <Typography color="text.secondary">
                    Haftalık üst sınır: {ruleProfile?.maxWeeklyDutyDays ?? 4} gün
                  </Typography>
                  <Typography color="text.secondary">
                    Gece sonrası gece: {ruleProfile?.allowNightAfterNight ? 'izinli' : 'engellenir'}
                  </Typography>
                  <Typography color="text.secondary">
                    Yönetici onayı: {ruleProfile?.requireManagerApproval ? 'gerekli' : 'opsiyonel'}
                  </Typography>
                </Box>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {config.rules.map((rule, index) => (
                    <Chip key={rule} color={index === 0 ? 'error' : index < 3 ? 'warning' : 'info'} label={rule} />
                  ))}
                </Stack>
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontWeight: 700 }}>Sağ Tık İşlemleri</Typography>
                  <Typography variant="body2" color="text.secondary">
                    İzin/rapor, yedek atama, acil birime çekme, on-call ve nöbet boşaltma işlemleri kart üzerinde sağ tıkla yapılır.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
        <Menu
          open={Boolean(contextMenu)}
          onClose={() => setContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        >
          <MenuItem
            onClick={() =>
              updateContextItem(
                (item) => ({ ...item, conflict: 'İzin/Rapor - yedek atanmalı', lane: 'Eksik nöbet' }),
                'İzin/rapor bilgisi işlendi. Bu nöbet için yedek atanmalı.',
              )
            }
          >
            İzin / Rapor İşle
          </MenuItem>
          <MenuItem onClick={assignReserveStaff}>Yedek Personel Ata</MenuItem>
          <MenuItem
            onClick={() =>
              updateContextItem(
                (item) => ({ ...item, location: 'Acil', conflict: 'Acil kapsama - öncelikli görev' }),
                'Nöbet acil kapsama görevi olarak güncellendi.',
              )
            }
          >
            Acil Göreve Çevir
          </MenuItem>
          <MenuItem
            onClick={() =>
              updateContextItem(
                (item) => ({ ...item, time: 'On-call 18:00 - 08:00', conflict: 'On-call kapsama' }),
                'Nöbet on-call olarak işaretlendi.',
              )
            }
          >
            On-call İşaretle
          </MenuItem>
          <MenuItem
            onClick={() =>
              updateContextItem(
                (item) => ({ ...item, conflict: 'Sorumlu hemşire / yönetici onayı gerekli' }),
                'Yönetici onayı notu eklendi.',
              )
            }
          >
            Yönetici Onayı Gerekli
          </MenuItem>
          <MenuItem onClick={clearContextAssignment}>Nöbeti Boşalt</MenuItem>
        </Menu>
      </Stack>
    </AppShell>
  );
}
