require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`hisabrakho-api listening on port ${PORT}`);
});
