import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const VisitorStatsCard = () => {
  const [totalViews, setTotalViews] = useState(0);
  const [chartData, setChartData] = useState([]);

  // Cargar estadísticas iniciales
  const fetchViews = async () => {
    const { data, count, error } = await supabase
      .from('page_views')
      .select('*', { count: 'exact' });

    if (!error && data) {
      setTotalViews(count || data.length);
      
      // Agrupar vistas por hora o día para la gráfica
      const grouped = data.reduce((acc, curr) => {
        const date = new Date(curr.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const formattedData = Object.keys(grouped).map(time => ({
        time,
        vistas: grouped[time]
      }));

      setChartData(formattedData.slice(-10)); // Mostrar las últimas 10 franjas de tiempo
    }
  };

  useEffect(() => {
    fetchViews();

    // Suscripción en Tiempo Real
    const subscription = supabase
      .channel('realtime_page_views')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, () => {
        fetchViews(); // Recargar contador y gráfica cuando entra un usuario nuevo
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">Vistas Totales de SEPH</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalViews}</p>
        </div>
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </div>

      <div className="h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
            <YAxis allowDecimals={false} stroke="#9CA3AF" fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey="vistas" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};