/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './legal/**/*.html'],
  theme: {
    extend: {
      colors: {
        // Client-driven brand: teal + cream + orange, with steel-blue / rust / gold accents.
        brand: {
          teal:      '#1AADA3',
          tealDark:  '#0D8A82',
          orange:    '#F07B1D',
          orangeLt:  '#FF9B3C',
          gold:      '#D4943A',
          steelBlue: '#5B8DB8',
          steelDark: '#3A6E9E',
          rust:      '#C0472E',
          rustDark:  '#9C3520',
          cream:     '#FAF7F2',
          dark:      '#0F1A1C',
          darker:    '#070E0F',
          text:      '#1C2B2D',
          muted:     '#6B7F81',
        },
      },
      fontFamily: {
        heading: ['Syne',   'system-ui', 'sans-serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:   '20px',
        button: '100px',
        pill:   '100px',
        chunk:  '14px',
      },
      boxShadow: {
        brand:        '0 4px 24px rgba(15, 26, 28, 0.10)',
        brandLift:    '0 16px 40px rgba(15, 26, 28, 0.12)',
        cardFloat:    '0 12px 40px rgba(15, 26, 28, 0.14)',
        ctaTeal:      '0 4px 14px rgba(26, 173, 163, 0.35)',
        ctaOrange:    '0 8px 24px rgba(240, 123, 29, 0.40)',
        phone:        '0 40px 80px rgba(15, 26, 28, 0.30)',
      },
      backgroundImage: {
        'brand-bar':       'linear-gradient(90deg, #1AADA3 0%, #F07B1D 100%)',
        'edtech-grad':     'linear-gradient(135deg, #1AADA3 0%, #0D8A82 100%)',
        'reseau-grad':     'linear-gradient(135deg, #C0472E 0%, #9C3520 100%)',
        'visibilite-grad': 'linear-gradient(135deg, #5B8DB8 0%, #3A6E9E 100%)',
        'hero-radial':
          'radial-gradient(ellipse 60% 60% at 75% 30%, rgba(26,173,163,.12) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 20% 80%, rgba(240,123,29,.10) 0%, transparent 70%)',
        'pillars-radial':
          'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(26,173,163,.15) 0%, transparent 70%)',
        'cta-radial':
          'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(26,173,163,.15) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 50%, rgba(240,123,29,.12) 0%, transparent 70%)',
      },
      maxWidth: {
        container: '1200px',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.08)' },
        },
        growBar: {
          'from': { width: '0%' },
          'to':   { width: 'var(--score, 92%)' },
        },
      },
      animation: {
        fadeUp:    'fadeUp .6s ease both',
        floatY:    'floatY 4s ease-in-out infinite',
        pulseSoft: 'pulseSoft 6s ease-in-out infinite',
        growBar:   'growBar 1.5s 1s ease both',
      },
    },
  },
  plugins: [],
};
