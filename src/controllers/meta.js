const { version } = require('../../package.json');

const getVersion = (req, res) => {
    res.json({ version: version });
};
const getPing = (req, res) => {
    res.json({ uptime: process.uptime() });
};

export { getVersion, getPing };
