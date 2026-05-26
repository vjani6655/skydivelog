import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Surfaces ──────────────────────────────────────────
        bg:           'var(--c-bg)',
        surface:      'var(--c-surface)',
        'surface-2':  'var(--c-surface-2)',
        'surface-3':  'var(--c-surface-3)',
        border:       'var(--c-border)',
        'border-strong': 'var(--c-border-strong)',

        // ─── Foreground ────────────────────────────────────────
        fg:           'var(--c-fg)',
        'fg-2':       'var(--c-fg-2)',
        'fg-3':       'var(--c-fg-3)',
        'fg-4':       'var(--c-fg-4)',

        // ─── Accents ───────────────────────────────────────────
        sky: {
          DEFAULT: 'var(--c-sky)',
          dim:     'var(--c-sky-dim)',
          bg:      'var(--c-sky-bg)',
        },
        cyan:   'var(--c-cyan)',

        // ─── Status ────────────────────────────────────────────
        warn: {
          DEFAULT: 'var(--c-warn)',
          bg:      'var(--c-warn-bg)',
        },
        danger: {
          DEFAULT: 'var(--c-danger)',
          bg:      'var(--c-danger-bg)',
        },
        ok: {
          DEFAULT: 'var(--c-ok)',
          bg:      'var(--c-ok-bg)',
        },

        // ─── On-accent (text on solid sky button) ──────────────
        'on-sky': 'var(--c-on-sky)',
      },

      fontFamily: {
        sans:  ['var(--font-sans)', 'Inter Tight', '-apple-system', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'micro':    ['9px',  { lineHeight: '1.2',  letterSpacing: '0.1em' }],
        'caption':  ['10px', { lineHeight: '1.2',  letterSpacing: '0.1em' }],
        'overline': ['11px', { lineHeight: '1.3',  letterSpacing: '0.08em' }],
        'xs':       ['12px', { lineHeight: '1.45' }],
        'sm':       ['13px', { lineHeight: '1.5'  }],
        'body':     ['14px', { lineHeight: '1.55' }],
        'base':     ['15px', { lineHeight: '1.4',  letterSpacing: '-0.01em' }],
        'md':       ['16px', { lineHeight: '1.5',  letterSpacing: '-0.01em' }],
        'lg':       ['17px', { lineHeight: '1.5'  }],
        'xl':       ['18px', { lineHeight: '1.4',  letterSpacing: '-0.02em' }],
        '2xl':      ['20px', { lineHeight: '1.3',  letterSpacing: '-0.02em' }],
        '3xl':      ['22px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        '4xl':      ['24px', { lineHeight: '1.2',  letterSpacing: '-0.025em' }],
        '5xl':      ['26px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '6xl':      ['28px', { lineHeight: '1.1',  letterSpacing: '-0.025em' }],
        'h1':       ['32px', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h1-lg':    ['40px', { lineHeight: '1.05', letterSpacing: '-0.03em',  fontWeight: '700' }],
        'display-sm':  ['48px', { lineHeight: '1.02', letterSpacing: '-0.03em',  fontWeight: '700' }],
        'display':     ['56px', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '700' }],
        'display-lg':  ['64px', { lineHeight: '1.0',  letterSpacing: '-0.035em', fontWeight: '700' }],
        'hero':        ['72px', { lineHeight: '0.98', letterSpacing: '-0.04em',  fontWeight: '700' }],
        'hero-lg':     ['88px', { lineHeight: '0.95', letterSpacing: '-0.04em',  fontWeight: '700' }],
        'num-sm':   ['16px', { lineHeight: '1.1' }],
        'num':      ['22px', { lineHeight: '1.05' }],
        'num-lg':   ['36px', { lineHeight: '1.05' }],
        'num-xl':   ['44px', { lineHeight: '1.05' }],
        'num-2xl':  ['72px', { lineHeight: '1.0' }],
      },

      fontWeight: {
        normal:   '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
      },

      spacing: {
        '0':   '0px',   '0.5': '2px',   '1':   '4px',   '1.5': '6px',
        '2':   '8px',   '2.5': '10px',  '3':   '12px',  '3.5': '14px',
        '4':   '16px',  '4.5': '18px',  '5':   '20px',  '5.5': '22px',
        '6':   '24px',  '7':   '28px',  '8':   '32px',  '9':   '36px',
        '10':  '40px',  '11':  '44px',  '12':  '48px',  '14':  '56px',
        '16':  '64px',  '18':  '72px',  '20':  '80px',  '24':  '96px',
        '28':  '112px', '32':  '128px',
      },

      borderRadius: {
        none: '0',
        sm:    '6px',
        DEFAULT: '8px',
        md:    '10px',
        lg:    '14px',
        xl:    '16px',
        '2xl': '20px',
        '3xl': '26px',
        pill:  '999px',
        full:  '9999px',
      },

      borderWidth: { '0': '0', '1': '1px', '2': '2px', '3': '3px' },

      boxShadow: {
        card:   '0 1px 2px rgba(0, 0, 0, 0.3)',
        pop:    '0 8px 24px rgba(0, 0, 0, 0.4)',
        sheet:  '0 -20px 60px rgba(0, 0, 0, 0.6)',
        glow:   '0 20px 60px rgba(74, 158, 255, 0.15)',
        device: '0 40px 80px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.12)',
      },

      letterSpacing: {
        tightest: '-0.04em', tighter: '-0.03em', tight: '-0.02em',
        snug: '-0.01em',     normal:  '0',       wide:  '0.06em',
        wider: '0.08em',     widest:  '0.1em',   mega:  '0.16em',
      },

      lineHeight: {
        none:    '1',
        tight:   '1.05',
        snug:    '1.15',
        normal:  '1.4',
        relaxed: '1.55',
        loose:   '1.7',
      },

      transitionDuration: { fast: '120ms', DEFAULT: '160ms', slow: '240ms' },

      backgroundImage: {
        'hero-glow':
          'radial-gradient(ellipse at top, rgba(74,158,255,0.12) 0%, transparent 70%)',
        'auth-glow':
          'radial-gradient(circle at 30% 20%, rgba(74,158,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(52,210,214,0.08) 0%, transparent 50%)',
        'card-promo':
          'linear-gradient(135deg, rgba(74,158,255,0.18), rgba(52,210,214,0.05))',
        'stripes':
          'repeating-linear-gradient(135deg, #1A2740 0 8px, #121C2E 8px 16px)',
      },
    },
  },
  plugins: [],
};

export default config;
