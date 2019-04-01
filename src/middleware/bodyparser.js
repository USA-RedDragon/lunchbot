import { json, urlencoded } from 'body-parser'; // Apparently morgan doesn't like esm syntax
import bodyparserConfig from '../config/middleware/bodyparser';

export default (app) => {
    app.use(json(bodyparserConfig.json));
    app.use(urlencoded(bodyparserConfig.urlencoded));
};
