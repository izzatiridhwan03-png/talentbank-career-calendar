/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          brown: "#7B231D",
          browndark: "#59160F",
          cream: "#F6F0DC",
          blue: "#F1D9CB",
          bluedark: "#E4C0AA",
          yellow: "#E8A93D",
          yellowdark: "#CE8E26",
          sage: "#DED0A8",
          sagedark: "#C4B384",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
