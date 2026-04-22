/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        blob: {
          "0%": { transform: "translate3d(0px, 0px, 0px) scale(0.9)" },
          "22%": { transform: "translate3d(28px, -32px, 0px) scale(1.06)" },
          "48%": { transform: "translate3d(-24px, 22px, 0px) scale(1.1)" },
          "72%": { transform: "translate3d(20px, 16px, 0px) scale(0.96)" },
          "100%": { transform: "translate3d(0px, 0px, 0px) scale(0.9)" }
        }
      },
      animation: {
        blob: "blob 16s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
