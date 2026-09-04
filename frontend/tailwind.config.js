/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#10284f",
        blue: "#1663ff",
        soft: "#eff4ff",
        text: "#1f2c3d",
        "text-soft": "#55657d",
      }
    },
  },
  plugins: [],
}
