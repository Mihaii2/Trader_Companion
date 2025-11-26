import React from 'react';
import { Alert as AlertType } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Power } from 'lucide-react';

interface AlertsTableProps {
  alerts: AlertType[];
  priceDirections: Map<number, 'up' | 'down'>;
  onToggleActive: (id: number, isActive: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({ alerts, priceDirections, onToggleActive, onDelete }) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getPriceDifference = (current: number | null, alert: number) => {
    if (current === null) return null;
    const diff = current - alert;
    const pct = ((diff / alert) * 100).toFixed(2);
    return { diff, pct };
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>No alerts created yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Alerts</CardTitle>
        <CardDescription>
          Monitor your ticker price alerts • Backend checks each ticker every ~1s
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Alert Price</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const priceDiff = getPriceDifference(alert.current_price, alert.alert_price);
                const isAbove = alert.current_price !== null && alert.current_price > alert.alert_price;
                const direction = priceDirections.get(alert.id);
                
                return (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.ticker}</TableCell>
                    <TableCell>
                      {alert.current_price !== null ? (
                        <span className={`font-semibold ${
                          !alert.is_active 
                            ? 'text-foreground' 
                            : (() => {
                                const direction = priceDirections.get(alert.id);
                                if (direction === 'up') return 'text-green-600 dark:text-green-500';
                                if (direction === 'down') return 'text-red-500 dark:text-red-400';
                                return 'text-foreground';
                              })()
                        }`}>
                          {formatPrice(alert.current_price)}
                        </span>
                      ) : (
                        formatPrice(alert.current_price)
                      )}
                      {!alert.is_active && alert.current_price !== null && (
                        <span className="ml-2 text-xs text-muted-foreground" title="Last known price (alert inactive)">
                          (last)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">
                        {formatPrice(alert.alert_price)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {priceDiff ? (
                        <span className={`font-semibold ${
                          priceDiff.diff >= 0 
                            ? 'text-green-600 dark:text-green-500' 
                            : 'text-red-500 dark:text-red-400'
                        }`}>
                          {priceDiff.diff >= 0 ? '+' : ''}{priceDiff.diff.toFixed(2)} ({priceDiff.pct}%)
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {alert.triggered ? (
                        <Badge variant="destructive">Triggered</Badge>
                      ) : alert.is_active ? (
                        <Badge variant="default" className="bg-green-700 dark:bg-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(alert.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (alert.is_active || alert.triggered) {
                              onToggleActive(alert.id, false);
                            }
                          }}
                          title={alert.is_active || alert.triggered ? 'Stop alarm' : 'Alert already stopped - can only be deleted'}
                          disabled={!alert.is_active && !alert.triggered}
                        >
                          {(alert.is_active || alert.triggered) ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4 opacity-30" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(alert.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

