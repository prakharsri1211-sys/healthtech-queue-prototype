/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        clinical: '#0D9488',
        'clinical-dark': '#0b7a6f',
        'patient-teal': '#0D9488',
        'doctor-slate': '#1E293B',
        'mediator-indigo': '#4F46E5',
        'status-late': '#DC2626',
        'status-waiting': '#F59E0B',
        'status-serving': '#10B981',
        
        // Unified UI Surface Colors
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        }
      },
      boxShadow: {
        'glass-subtle': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glass-glow': '0 0 20px rgba(13, 148, 136, 0.15)',
      }
    },
  },
}
