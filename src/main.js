import app from './app.js';

const port = process.env.PORT || 6500;
const { name } = require('../package.json');

app.listen(port, () => console.log(`${name} listening on port ${port}!`));
