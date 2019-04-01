const morgan = require('morgan'); // Apparently morgan doesn't like esm syntax
import morganConfig from '../config/middleware/morgan';

export default (app) => {
    app.use(morgan(morganConfig.logFormat, morganConfig.options));
};
