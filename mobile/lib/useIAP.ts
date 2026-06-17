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

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';

export type IAPStatus = 'loading' | 'ready' | 'purchasing' | 'validating' | 'success' | 'error' | 'unavailable';

export function useIAP() {
  const [status, setStatus]           = useState<IAPStatus>(
    Platform.OS !== 'ios' ? 'ready' : !iapModule ? 'unavailable' : 'loading'
  );
  const [error, setError]             = useState('');
  const [localizedPrice, setLocalizedPrice] = useState<string | null>(null);

  const mountedRef          = useRef(true);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const errorListenerRef    = useRef<{ remove: () => void } | null>(null);

  const validateReceipt = async (purchase: { productId: string }) => {
    console.log('[IAP] validateReceipt start, productId:', purchase.productId);
    try {
      // PurchaseIOS does not carry receiptData/jwsRepresentation directly.
      // getReceiptIOS() reads the on-disk receipt file (plain async fn, most reliable).
      // If empty, requestReceiptRefreshIOS() forces Apple to rewrite the file via
      // SKReceiptRefreshRequest — necessary immediately after a first-ever purchase.
      let receipt: string | null = null;
      const iosModule = iapModule as unknown as {
        getReceiptIOS: () => Promise<string | null>;
        requestReceiptRefreshIOS: () => Promise<string>;
      };
      try {
        receipt = (await iosModule.getReceiptIOS?.()) ?? null;
        console.log('[IAP] getReceiptIOS length:', receipt?.length ?? 0);
        if (!receipt) {
          console.log('[IAP] receipt empty, calling requestReceiptRefreshIOS...');
          receipt = (await iosModule.requestReceiptRefreshIOS?.()) ?? null;
          console.log('[IAP] requestReceiptRefreshIOS length:', receipt?.length ?? 0);
        }
      } catch (receiptErr) {
        console.log('[IAP] receipt fetch error:', String(receiptErr));
      }
      if (!receipt) {
        if (mountedRef.current) {
          setError('Could not retrieve purchase receipt. Please contact support.');
          setStatus('error');
        }
        return;
      }
      // getSession() returns a cached (possibly expired) token from AsyncStorage.
      // Force-refresh so the server's verifyBearerToken call succeeds.
      let { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
      console.log('[IAP] refreshSession result - session:', !!session, 'error:', refreshErr?.message ?? 'none');
      if (!session) {
        // refreshSession failed (e.g. network error) — fall back to cached session
        const fallback = await supabase.auth.getSession();
        session = fallback.data.session;
        console.log('[IAP] getSession fallback - session:', !!session, 'expires_at:', session?.expires_at);
      } else {
        console.log('[IAP] refreshSession OK, token expires_at:', session.expires_at, 'user:', session.user?.id);
      }
      if (!session) {
        console.log('[IAP] validateReceipt: no session');
        setError('Not signed in. Please restart the app.');
        if (mountedRef.current) setStatus('error');
        return;
      }
      console.log('[IAP] validateReceipt: posting to', `${WEB_URL}/api/apple/validate`);
      const res = await fetch(`${WEB_URL}/api/apple/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ receipt }),
      });
      const json = await res.json();
      console.log('[IAP] validateReceipt response:', JSON.stringify(json));

      await iapModule?.finishTransaction({ purchase: purchase as never, isConsumable: false }).catch((e) => {
        console.log('[IAP] finishTransaction error:', String(e));
      });

      if (json.success) {
        console.log('[IAP] validateReceipt: success');
        if (mountedRef.current) setStatus('success');
      } else {
        console.log('[IAP] validateReceipt: failed', json.error);
        if (mountedRef.current) {
          setError(json.error ?? 'Validation failed. Please contact support.');
          setStatus('error');
        }
      }
    } catch (e) {
      console.log('[IAP] validateReceipt exception:', String(e));
      await iapModule?.finishTransaction({ purchase: purchase as never, isConsumable: false }).catch(() => {});
      if (mountedRef.current) {
        setError('Could not validate purchase. Please contact support.');
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'ios' || !iapModule) {
      return;
    }

    mountedRef.current = true;
    console.log('[IAP] useEffect mount, iapModule:', !!iapModule, 'platform:', Platform.OS);
    console.log('[IAP] product ID:', APPLE_PRODUCT_ID);

    purchaseListenerRef.current = iapModule.purchaseUpdatedListener(async (purchase) => {
      console.log('[IAP] purchaseUpdatedListener fired, productId:', purchase.productId, 'keys:', Object.keys(purchase).join(','));
      if (!mountedRef.current) return;
      if (purchase.productId !== APPLE_PRODUCT_ID) {
        console.log('[IAP] ignoring purchase for different product:', purchase.productId);
        return;
      }
      if (mountedRef.current) setStatus('validating');
      await validateReceipt(purchase);
    });

    errorListenerRef.current = iapModule.purchaseErrorListener((err: unknown) => {
      console.log('[IAP] purchaseErrorListener fired:', JSON.stringify(err));
      if (!mountedRef.current) return;
      const code = (err as Record<string, string>)?.code;
      if (code === 'E_USER_CANCELLED') { setStatus('ready'); return; }
      setError('Purchase could not be completed. Please try again.');
      setStatus('error');
    });

    (async () => {
      try {
        console.log('[IAP] initConnection start');
        await iapModule!.initConnection();
        console.log('[IAP] initConnection OK');
      } catch (err: unknown) {
        console.log('[IAP] initConnection failed:', String(err));
        if (mountedRef.current) {
          setError('Could not connect to the App Store. Please try again.');
          setStatus('error');
        }
        return;
      }
      try {
        console.log('[IAP] fetchProducts start, sku:', APPLE_PRODUCT_ID);
        const products = await iapModule!.fetchProducts({ skus: [APPLE_PRODUCT_ID], type: 'subs' });
        console.log('[IAP] fetchProducts result count:', products?.length, 'raw:', JSON.stringify(products));
        const product = products?.find((p) => p.id === APPLE_PRODUCT_ID);
        console.log('[IAP] matched product:', JSON.stringify(product));
        if (!product) {
          if (mountedRef.current) {
            console.log('[IAP] product not found, returned:', products?.length, products?.map((p) => p.id).join(', '), 'looking for:', APPLE_PRODUCT_ID);
            setError('Subscription not available. Please try again later or contact support.');
            setStatus('error');
          }
          return;
        }
        if (mountedRef.current) setLocalizedPrice((product as unknown as Record<string, unknown>).displayPrice as string ?? null);
        if (mountedRef.current) setStatus('ready');
        console.log('[IAP] ready, price:', (product as unknown as Record<string, unknown>).displayPrice);
      } catch (err: unknown) {
        console.log('[IAP] fetchProducts error:', String(err));
        if (mountedRef.current) {
          setError('Could not load subscription details. Please try again.');
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
  }, []);

  const startPurchase = async () => {
    console.log('[IAP] startPurchase called, status:', status, 'iapModule:', !!iapModule);
    if (status !== 'ready' || !iapModule) return;
    setError('');
    setStatus('purchasing');
    try {
      console.log('[IAP] requestPurchase start, sku:', APPLE_PRODUCT_ID);
      await iapModule.requestPurchase({ request: { apple: { sku: APPLE_PRODUCT_ID } }, type: 'subs' });
      console.log('[IAP] requestPurchase returned (waiting for purchaseUpdatedListener)');
    } catch (err: unknown) {
      const code = (err as Record<string, string>)?.code;
      console.log('[IAP] requestPurchase error, code:', code, 'message:', (err as Record<string, string>)?.message);
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

  const fetchAndSetProduct = async () => {
    if (!iapModule) { setStatus('unavailable'); return; }
    setError('');
    setStatus('loading');
    try {
      await iapModule.initConnection();
      console.log('[IAP] initConnection OK');
    } catch (err: unknown) {
      console.log('[IAP] initConnection error (may already be connected):', String(err));
    }
    try {
      console.log('[IAP] fetchProducts start, sku:', APPLE_PRODUCT_ID);
      const products = await iapModule.fetchProducts({ skus: [APPLE_PRODUCT_ID], type: 'subs' });
      console.log('[IAP] fetchProducts result:', JSON.stringify(products));
      const product = products?.find((p) => p.id === APPLE_PRODUCT_ID);
      if (!product) {
        console.log('[IAP] reset: product not found, returned:', products?.length, products?.map((p) => p.id).join(', '), 'looking for:', APPLE_PRODUCT_ID);
        setError('Subscription not available. Please try again later or contact support.');
        setStatus('error');
        return;
      }
      setLocalizedPrice((product as unknown as Record<string, unknown>).displayPrice as string ?? null);
      setStatus('ready');
    } catch (err: unknown) {
      console.log('[IAP] fetchProducts error:', String(err));
      setError('Could not load subscription details. Please try again.');
      setStatus('error');
    }
  };

  const reset = () => { fetchAndSetProduct(); };

  return { status, error, localizedPrice, startPurchase, restorePurchases, reset };
}
