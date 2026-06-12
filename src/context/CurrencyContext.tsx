import React, { createContext, useContext, useState, useEffect } from 'react';
import countryToCurrency from 'country-to-currency';
import { safeStorage } from '@/lib/storage';

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 155.0,
  CAD: 1.37,
  AUD: 1.51,
  INR: 83.5,
};

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatAmount: (amount: number) => string;
  loadingLocation: boolean;
  convertFromUSD: (amount: number, targetCurrency?: string) => number;
  convertToUSD: (amount: number, sourceCurrency?: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  formatAmount: (amount) => `$${amount.toFixed(2)}`,
  loadingLocation: true,
  convertFromUSD: (amount) => amount,
  convertToUSD: (amount) => amount,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState(() => {
    return safeStorage.getItem('primary_currency') || 'USD';
  });
  const [loadingLocation, setLoadingLocation] = useState(true);

  const setCurrency = (newVal: string) => {
    safeStorage.setItem('primary_currency', newVal);
    setCurrencyState(newVal);
  };

  useEffect(() => {
    // If user has already set a primary choice, do not override with geolocation
    if (safeStorage.getItem('primary_currency')) {
      setLoadingLocation(false);
      return;
    }

    const fetchByIP = async () => {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data?.country_code) {
          const code = data.country_code.toUpperCase();
          const curr = (countryToCurrency as any)[code];
          if (curr && EXCHANGE_RATES[curr]) {
            setCurrencyState(curr);
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
              if (curr && EXCHANGE_RATES[curr]) {
                setCurrencyState(curr);
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

  const convertFromUSD = (amount: number, targetCurrency: string = currency) => {
    const rate = EXCHANGE_RATES[targetCurrency] || 1.0;
    return amount * rate;
  };

  const convertToUSD = (amount: number, sourceCurrency: string = currency) => {
    const rate = EXCHANGE_RATES[sourceCurrency] || 1.0;
    return amount / rate;
  };

  const formatAmount = (amount: number) => {
    try {
      const converted = convertFromUSD(amount);
      return new Intl.NumberFormat(navigator.language, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      const rate = EXCHANGE_RATES[currency] || 1.0;
      return `${currency} ${(amount * rate).toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, loadingLocation, convertFromUSD, convertToUSD }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
