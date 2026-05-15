/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './legal/**/*.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          primaryDark:  '#1A0A3E',
          primaryMid:   '#2D1B69',
          primaryLight: '#6C3CE0',
          gold:         '#F5A623',
          green:        '#2ECC71',
          red:          '#E74C3C',
          blue:         '#3498DB',
        },
        // 3 Piliers accents -- warmer, slightly desaturated vs. raw web colors so they
        // sit politely next to the purple+gold brand instead of fighting it.
        pilier: {
          edtech:        '#1FA85F',  // green   -- Certifiez
          edtechSoft:    '#E6F7EE',
          reseau:        '#D9613A',  // terracotta -- Reseau Artisans
          reseauSoft:    '#FBEAE2',
          visibilite:    '#2A7AC4',  // blue   -- Booster Visibilite
          visibiliteSoft:'#E4F0FA',
        },
        blob: {
          orange: '#F5A623',
          red:    '#E74C3C',
          yellow: '#F1C40F',
          purple: '#6C3CE0',
        },
        neutral: {
          white:   '#FFFFFF',
          ink:     '#1A0A3E',
          muted:   '#6B6B7E',
          surface: '#F7F5FB',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body:    ['Inter',   'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:   '1rem',
        button: '0.75rem',
        pill:   '9999px',
      },
      boxShadow: {
        brand: '0 4px 20px rgba(26, 10, 62, 0.08)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(180deg, #6C3CE0 0%, #2D1B69 55%, #1A0A3E 100%)',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};
