import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIInsightsWidget({ customers, salesInvoices, products }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const topCustomers = (customers || []).slice(0, 5).map(c => c.name).join(', ');
    const totalRev = (salesInvoices || []).reduce((s, i) => s + (i.total || 0), 0);
    const overdueCount = (salesInvoices || []).filter(i => i.status === 'overdue').length;
    const productCount = (products || []).length;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI business analyst for a Greek commercial ERP. Based on this data, provide 3-4 concise business insights and recommendations:
- Total Revenue: €${totalRev.toFixed(2)}
- Number of Products: ${productCount}
- Top Customers: ${topCustomers || 'None yet'}
- Overdue Invoices: ${overdueCount}
- Total Customers: ${(customers || []).length}
Give actionable insights in 2-3 sentences each. Format as JSON array of objects with "title" and "description" fields.`,
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    });
    setInsights(result.insights || []);
    setLoading(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            AI Business Insights
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateInsights} disabled={loading} className="h-8 gap-1.5 text-xs">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {insights ? 'Refresh' : 'Generate'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !loading && (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click Generate to get AI-powered insights about your business</p>
          </div>
        )}
        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Analyzing your data...</p>
          </div>
        )}
        {insights && !loading && (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {insight.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}