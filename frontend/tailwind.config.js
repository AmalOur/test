/** @type {import('tailwindcss').Config} */
/*module.exports = {
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
}
*/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        darkgreen: {
          800: '#081107',  
          900: '#012A08',  
        },
        darkred: {
          800: '#660000',  
          900: '#241313',  
        },
      },
    },
  },
  plugins: [],
}