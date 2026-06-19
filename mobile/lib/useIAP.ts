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

  const validateReceipt = async (purchase: { productId: string }, forceRefresh = false) => {
    console.log('[IAP] validateReceipt start, productId:', purchase.productId, 'forceRefresh:', forceRefresh);
    try {
      const iosModule = iapModule as unknown as {
        getReceiptIOS: () => Promise<string | null>;
        requestReceiptRefreshIOS: () => Promise<string>;
      };

      let receipt: string | null = null;
      try {
        if (forceRefresh) {
          // Force Apple to rewrite the receipt file — used when the on-disk receipt
          // is stale (e.g. first-ever purchase on a fresh install returns 21003).
          console.log('[IAP] forceRefresh: calling requestReceiptRefreshIOS...');
          receipt = (await iosModule.requestReceiptRefreshIOS?.()) ?? null;
          console.log('[IAP] requestReceiptRefreshIOS length:', receipt?.length ?? 0);
        } else {
          receipt = (await iosModule.getReceiptIOS?.()) ?? null;
          console.log('[IAP] getReceiptIOS length:', receipt?.length ?? 0);
          if (!receipt) {
            console.log('[IAP] receipt empty, calling requestReceiptRefreshIOS...');
            receipt = (await iosModule.requestReceiptRefreshIOS?.()) ?? null;
            console.log('[IAP] requestReceiptRefreshIOS length:', receipt?.length ?? 0);
          }
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

      // Force-refresh so the server's verifyBearerToken call succeeds.
      let { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
      console.log('[IAP] refreshSession result - session:', !!session, 'error:', refreshErr?.message ?? 'none');
      if (!session) {
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
      } else if (!forceRefresh && json.appleStatus === 21003) {
        // Stale on-disk receipt — force Apple to reissue and retry once.
        console.log('[IAP] got 21003, retrying with requestReceiptRefreshIOS...');
        await validateReceipt(purchase, true);
      } else if (json.appleStatus === 21003) {
        // verifyReceipt returned 21003 even after a forced receipt refresh.
        // On iOS 27 beta, Apple's deprecated verifyReceipt endpoint rejects valid receipts.
        // Apple independently sends a SUBSCRIBED webhook (with our appAccountToken as user_id)
        // which creates the subscription row — wait briefly then check Supabase directly.
        console.log('[IAP] 21003 on forced receipt refresh — waiting for webhook subscription...');
        await new Promise<void>(r => setTimeout(r, 3500));
        const { data: { user: webhookUser } } = await supabase.auth.getUser();
        if (webhookUser) {
          const { data: webhookSub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', webhookUser.id)
            .eq('status', 'active')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (webhookSub) {
            console.log('[IAP] subscription confirmed via webhook fallback, success');
            if (mountedRef.current) setStatus('success');
            return;
          }
        }
        console.log('[IAP] no subscription found after webhook fallback check');
        if (mountedRef.current) {
          setError(json.error ?? 'Validation failed. Please contact support.');
          setStatus('error');
        }
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
      const msg  = (err as Record<string, string>)?.message ?? '';
      // expo-iap uses kebab-case codes ('user-cancelled', 'already-owned')
      const isCancelled = code === 'E_USER_CANCELLED' || code === 'user-cancelled' || msg.toLowerCase().includes('cancel');
      if (isCancelled) { setStatus('ready'); return; }
      // StoreKit emits already-owned when the sandbox account has an active subscription.
      // The subscription row may already exist in Supabase — check before showing an error.
      const isAlreadyOwned = code === 'already-owned' || msg.toLowerCase().includes('already');
      if (isAlreadyOwned) {
        console.log('[IAP] already-owned — checking Supabase for active subscription');
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!mountedRef.current) return;
          if (!user) { setError('Purchase could not be completed. Please try again.'); setStatus('error'); return; }
          supabase.from('subscriptions').select('status').eq('user_id', user.id).eq('status', 'active')
            .order('started_at', { ascending: false }).limit(1).maybeSingle()
            .then(async ({ data }) => {
              if (!mountedRef.current) return;
              if (data) {
                console.log('[IAP] already-owned: active sub found in Supabase, success');
                setStatus('success');
              } else {
                // No Supabase row but Apple says already-owned — the Apple subscription exists
                // but our DB is out of sync. Auto-restore to re-validate and create the row.
                console.log('[IAP] already-owned: no Supabase row — auto-restoring');
                if (!iapModule) { setError('Purchase could not be completed. Please try again.'); setStatus('error'); return; }
                try {
                  const purchases = await iapModule.getAvailablePurchases();
                  const ours = purchases.find((p) => p.productId === APPLE_PRODUCT_ID);
                  if (ours) {
                    await validateReceipt(ours);
                  } else {
                    setError('Purchase could not be completed. Please try again.');
                    setStatus('error');
                  }
                } catch {
                  setError('Purchase could not be completed. Please try again.');
                  setStatus('error');
                }
              }
            });
        });
        return;
      }
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
      // appAccountToken links the Apple purchase to our Supabase user UUID.
      // Apple echoes it in SUBSCRIBED webhook notifications, allowing the webhook
      // to create the subscription row even when verifyReceipt fails (e.g. iOS 27 beta).
      const { data: { user: purchaseUser } } = await supabase.auth.getUser();
      console.log('[IAP] requestPurchase start, sku:', APPLE_PRODUCT_ID, 'appAccountToken:', purchaseUser?.id ?? 'none');
      // Use 'ios' key (not 'apple') — openiap 1.3.15 resolveIosPurchaseProps
      // only reads platforms.ios; platforms.apple is parsed but never accessed.
      await iapModule.requestPurchase({ request: { ios: { sku: APPLE_PRODUCT_ID, appAccountToken: purchaseUser?.id ?? undefined } }, type: 'subs' });
      console.log('[IAP] requestPurchase returned (waiting for purchaseUpdatedListener)');
    } catch (err: unknown) {
      const code = (err as Record<string, string>)?.code;
      const msg  = (err as Record<string, string>)?.message ?? '';
      console.log('[IAP] requestPurchase error, code:', code, 'message:', msg);
      const isCancelled = code === 'E_USER_CANCELLED' || msg.toLowerCase().includes('cancel');
      if (isCancelled) { setStatus('ready'); }
      else { setError('Purchase could not be completed. Please try again.'); setStatus('error'); }
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
