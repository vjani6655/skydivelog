import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// expo-iap is excluded from native autolinking in local dev builds.
// Expo modules use their own registry (not NativeModules), so we detect
// availability by attempting require and catching the native module error.
let iapModule: typeof import('expo-iap') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  iapModule = require('expo-iap');
} catch {
  iapModule = null;
}

export const APPLE_PRODUCT_ID =
  process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID ?? 'com.skydivelog.app.pro_annual';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://jumplogs.com';

export type IAPStatus = 'loading' | 'ready' | 'purchasing' | 'validating' | 'success' | 'error' | 'unavailable';

export function useIAP() {
  const [status, setStatus]           = useState<IAPStatus>('loading');
  const [error, setError]             = useState('');
  const [localizedPrice, setLocalizedPrice] = useState<string | null>(null);

  const mountedRef          = useRef(true);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const errorListenerRef    = useRef<{ remove: () => void } | null>(null);

  const validateReceipt = async (purchase: { transactionReceipt?: string; productId: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not signed in. Please restart the app.');
        if (mountedRef.current) setStatus('error');
        return;
      }

      const res = await fetch(`${WEB_URL}/api/apple/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ receipt: purchase.transactionReceipt }),
      });
      const json = await res.json();

      await iapModule?.finishTransaction({ purchase: purchase as never, isConsumable: false }).catch(() => {});

      if (json.success) {
        if (mountedRef.current) setStatus('success');
      } else {
        if (mountedRef.current) {
          setError(json.error ?? 'Validation failed. Please contact support.');
          setStatus('error');
        }
      }
    } catch {
      await iapModule?.finishTransaction({ purchase: purchase as never, isConsumable: false }).catch(() => {});
      if (mountedRef.current) {
        setError('Could not validate purchase. Please contact support.');
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setStatus('ready');
      return;
    }

    if (!iapModule) {
      // expo-iap native module not linked — dev build without IAP support
      setStatus('unavailable');
      return;
    }

    mountedRef.current = true;

    purchaseListenerRef.current = iapModule.purchaseUpdatedListener(async (purchase) => {
      if (!mountedRef.current) return;
      if (purchase.productId !== APPLE_PRODUCT_ID) return;
      if (mountedRef.current) setStatus('validating');
      await validateReceipt(purchase);
    });

    errorListenerRef.current = iapModule.purchaseErrorListener((err: unknown) => {
      if (!mountedRef.current) return;
      const code = (err as Record<string, string>)?.code;
      if (code === 'E_USER_CANCELLED') { setStatus('ready'); return; }
      setError((err as Record<string, string>)?.message ?? 'Purchase failed.');
      setStatus('error');
    });

    (async () => {
      try {
        await iapModule!.initConnection();
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(`StoreKit init failed: ${(err as Record<string, string>)?.message ?? String(err)}`);
          setStatus('error');
        }
        return;
      }
      try {
        const products = await iapModule!.fetchProducts({ skus: [APPLE_PRODUCT_ID], type: 'subs' });
        const product = products.find((p) => p.productId === APPLE_PRODUCT_ID);
        if (mountedRef.current && product?.localizedPrice) setLocalizedPrice(product.localizedPrice);
        if (mountedRef.current) setStatus('ready');
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(`Product fetch failed (${APPLE_PRODUCT_ID}): ${(err as Record<string, string>)?.message ?? String(err)}`);
          setStatus('error');
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      purchaseListenerRef.current?.remove();
      errorListenerRef.current?.remove();
      iapModule?.endConnection().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPurchase = async () => {
    if (status !== 'ready' || !iapModule) return;
    setError('');
    setStatus('purchasing');
    try {
      await iapModule.requestPurchase({ sku: APPLE_PRODUCT_ID });
    } catch (err: unknown) {
      const code = (err as Record<string, string>)?.code;
      if (code === 'E_USER_CANCELLED') { setStatus('ready'); }
      else { setError((err as Record<string, string>)?.message ?? 'Could not start purchase.'); setStatus('error'); }
    }
  };

  const restorePurchases = async () => {
    if ((status !== 'ready' && status !== 'error') || !iapModule) return;
    setError('');
    setStatus('validating');
    try {
      const purchases = await iapModule.getAvailablePurchases();
      const ours = purchases.find((p) => p.productId === APPLE_PRODUCT_ID);
      if (ours) { await validateReceipt(ours); }
      else { setError('No active subscription found for this Apple ID.'); setStatus('error'); }
    } catch {
      setError('Could not restore purchases. Please try again.');
      setStatus('error');
    }
  };

  const reset = () => { setError(''); setStatus(iapModule ? 'ready' : 'unavailable'); };

  return { status, error, localizedPrice, startPurchase, restorePurchases, reset };
}
