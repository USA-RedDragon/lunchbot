import { readdirSync } from 'fs';
import { join } from 'path';

export default (app) => {
    readdirSync(__dirname)
        .filter(function(file) {
            return (file.indexOf('.') !== 0) && (file !== 'index.js');
        })
        .forEach(function(file) {
            const applyMiddleware = require(join(__dirname, file)).default;
            applyMiddleware(app);
        });
};
