import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function VisitorStatsCard() {
  const [totalViews, setTotalViews] = useState(0);
  const [chartData, setChartData] = useState([]);

  const fetchViews = async () => {
    try {
      const { data, count, error } = await supabase
        .from('page_views')
        .select('*', { count: 'exact' });

      if (!error && data) {
        setTotalViews(count || data.length);
        
        const grouped = data.reduce((acc, curr) => {
          const date = new Date(curr.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const formattedData = Object.keys(grouped).map(time => ({
          time,
          vistas: grouped[time]
        }));

        setChartData(formattedData.slice(-6));
      }
    } catch (err) {
      console.error("Error cargando vistas:", err);
    }
  };

  useEffect(() => {
    fetchViews();

    const subscription = supabase
      .channel('realtime_page_views')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, () => {
        fetchViews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      border: '1px solid #e2e6ed',
      marginBottom: '20px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px' 
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>
            Vistas en Tiempo Real
          </span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginTop: '2px' }}>
            {totalViews}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            height: '8px',
            width: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>En Vivo</span>
        </div>
      </div>

      <div style={{ width: '100%', height: '80px', minWidth: '0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" stroke="#9ca3af" fontSize={9} />
            <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={9} width={20} />
            <Tooltip />
            <Line type="monotone" dataKey="vistas" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}