import { postSlashLunch, postSlashVote } from '../controllers/slash';

export default (app) => {
    app.post('/slash/lunch', postSlashLunch);
    app.post('/slash/vote', postSlashVote);
};
