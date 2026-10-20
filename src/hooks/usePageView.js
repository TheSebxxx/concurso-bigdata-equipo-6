import { useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Ajusta la ruta a tu cliente de Supabase

export const usePageView = () => {
  useEffect(() => {
    const recordView = async () => {
      try {
        await supabase.from('page_views').insert([{ page_path: window.location.hash || '/' }]);
      } catch (error) {
        console.error('Error al registrar la visita:', error);
      }
    };

    recordView();
  }, []);
};