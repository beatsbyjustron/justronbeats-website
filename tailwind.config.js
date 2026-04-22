/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      animation: { "orb-float": "orb-float 20s infinite alternate" },
      keyframes: {
        "orb-float": {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(100px, -50px) scale(1.2)" },
          "66%": { transform: "translate(-50px, 100px) scale(0.8)" },
          "100%": { transform: "translate(0, 0) scale(1)" }
        }
      }
    }
  },
  plugins: []
};
