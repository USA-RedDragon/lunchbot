import { getRoot } from '../controllers/root';

export default (app) => {
    app.get('/', getRoot);
};
