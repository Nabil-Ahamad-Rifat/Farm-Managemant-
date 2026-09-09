/** @type {import('tailwindcss').Config} */
module.exports = {
  // apps/web's Manager components lean heavily on Tailwind's default
  // emerald/slate/red/amber palette (bg-emerald-600, border-slate-200, etc.)
  // — no custom theme needed here to match, since NativeWind ships that same
  // default palette out of the box.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
