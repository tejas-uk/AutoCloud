const lucide = require('lucide-react');
console.log("Available GitHub icons:");
Object.keys(lucide).filter(key => key.toLowerCase().includes('github')).forEach(icon => {
  console.log(icon);
});