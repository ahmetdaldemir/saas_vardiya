import { Card, CardContent, Typography } from '@mui/material';

export function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}
