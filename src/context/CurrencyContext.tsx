import React, { createContext, useContext, useState, useEffect } from 'react';
import countryToCurrency from 'country-to-currency';

interface CurrencyContextType {
  currency: string;
  formatAmount: (amount: number) => string;
  loadingLocation: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  formatAmount: (amount) => `$${amount.toFixed(2)}`,
  loadingLocation: true,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState('USD');
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    const fetchByIP = async () => {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data?.country_code) {
          const code = data.country_code.toUpperCase();
          const curr = (countryToCurrency as any)[code];
          if (curr) {
            setCurrency(curr);
          }
        }
      } catch (e) {
        console.warn('Silent fallback to default currency context');
      } finally {
        setLoadingLocation(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            if (data?.address?.country_code) {
              const code = data.address.country_code.toUpperCase();
              const curr = (countryToCurrency as any)[code];
              if (curr) {
                setCurrency(curr);
                setLoadingLocation(false);
                return;
              }
            }
          } catch (e) {
             console.warn('Location API fetch failed, trying IP fallback');
          }
          fetchByIP(); // fallback
        },
        () => {
          fetchByIP(); // fallback if denied
        }
      );
    } else {
      fetchByIP();
    }
  }, []);

  const formatAmount = (amount: number) => {
    try {
      return new Intl.NumberFormat(navigator.language, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatAmount, loadingLocation }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
