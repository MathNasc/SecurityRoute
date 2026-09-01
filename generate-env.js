const fs = require('fs');
const key = process.env.CARTO_API_KEY || '';
fs.writeFileSync('./js/env.js', `window.ENV = { CARTO_API_KEY: "${key}" };\n`);
console.log('Environment variables injected into js/env.js');
