import { getVersion, getPing } from '../controllers/meta';

export default (app) => {
    app.get('/version', getVersion);

    app.get('/ping', getPing);
};
