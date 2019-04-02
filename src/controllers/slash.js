import axios from 'axios';
import { createClient } from 'redis';
import uuid from 'uuid/v4';
import _ from 'lodash';

const maps = require('@google/maps').createClient({
    key: process.env.MAPS_API_KEY,
});

const redis = createClient();

export async function postSlashLunch(req, res) {
    const pollId = uuid();
    getLocationCoords(req.body.text || 'Clevyr, Inc').then((coords) => {
        getRestaurants(coords).then((lunchOptions) => {
            const poll = buildPoll(lunchOptions, pollId);
            set(pollId, poll);
            res.json({
                response_type: 'in_channel',
                blocks: poll,
            });
        });
    }).catch((err) => {
        console.error(err);
        res.sendStatus(400);
    });
};

export async function postSlashVote(req, res) {
    const payload = JSON.parse(req.body.payload);
    const blockId = payload.actions[0].block_id;
    const { pollId, buttonId } = parseIds(blockId);

    await updateUserSelection(pollId, buttonId, payload.user);
    const poll = await refreshPoll(pollId);

    await axios.post(payload.response_url, { replace_original: true, blocks: poll });

    res.sendStatus(204);
};

function getLocationCoords(location) {
    return new Promise((resolve, reject) => {
        maps.geocode({ address: location }, (err, response) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            resolve(response.json.results[0].geometry.location);
        });
    });
}

function getRestaurants(coords) {
    return new Promise((resolve, reject) => {
        maps.placesNearby(
            { location: coords, type: 'restaurant', opennow: true, rankby: 'distance' },
            (err, response) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(response.json.results);
            });
    });
}

function getPlacePhoto(photoReference) {
    return new Promise((resolve, reject) => {
        reject(new Error('ENOENT: Not yet implemented'));
        return;
        maps.placesPhoto({ photoreference: photoReference }, (err, response) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.log(response);
            resolve(response.json.results);
        });
    });
}

async function updateUserSelection(pollId, buttonId, user) {
    const userSelection = await get(`${pollId}_userSelection`);
    if (userSelection[user.id] && userSelection[user.id] === buttonId) {
        _.unset(userSelection, user.id);
    } else {
        _.set(userSelection, user.id, buttonId);
    }
    await set(`${pollId}_userSelection`, userSelection);
}

async function refreshPoll(pollId) {
    const poll = await get(pollId);
    const userSelection = await get(`${pollId}_userSelection`);
    const mappedUserSelection = _.reduce(userSelection, (acc, selection, user) => {
        if (!acc[selection]) acc[selection] = [];
        acc[selection].push(user);

        return acc;
    }, {});

    return poll.map((pollItem) => {
        if (!pollItem.accessory || pollItem.accessory.type !== 'button') return pollItem;

        const { buttonId } = parseIds(pollItem.block_id);
        if (mappedUserSelection[buttonId]) {
            pollItem.text.text = mappedUserSelection[buttonId]
                .map((user) => `<@${user}>`)
                .join(', ');
        }

        return pollItem;
    });
}

function buildPoll(options, pollId) {
    const restaurantMeta = [];
    const buttonMeta = [];
    options.forEach(async (item) => {
        const hasPhoto = false; // !!item.photos;
        let photo = null;
        if (hasPhoto) {
            photo = getPlacePhoto(item.photos[0].photo_reference).then((retrievedPhoto) => {
                photo = retrievedPhoto;
            }).catch((err) => {
                console.error(err);
            });
        }
        const restaurantObject = {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${item.name}*\n` +
                    `${item.rating} Stars ` +
                    `${':star:'.repeat(Math.floor(item.rating))} ${item.user_ratings_total} reviews`,
            },
        };
        if (hasPhoto && photo) {
            restaurantObject.accessory = {
                type: 'image',
                image_url: photo,
                alt_text: 'alt text for image',
            };
        }
        restaurantMeta.push(restaurantObject);
        buttonMeta.push({
            type: 'section',
            block_id: `${pollId}:${uuid()}`,
            text: {
                type: 'mrkdwn',
                text: 'No votes',
            },
            accessory: {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: item.name,
                },
                value: item.name,
            },
        });
    });
    let blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Where should we eat lunch?\n\n *Please select a restaurant:*',
            },
        },
        {
            type: 'divider',
        }];
    blocks = blocks.concat(restaurantMeta);
    blocks.push({
        type: 'divider',
    });
    return blocks.concat(buttonMeta);
};

function parseIds(blockId) {
    const parsed = blockId.match(/^(.+):(.+)$/i);
    if (!parsed) throw new Error('Couldn\'t parse ids');

    return {
        pollId: parsed[1],
        buttonId: parsed[2],
    };
}

async function get(id, defaultValue = {}) {
    const value = await new Promise((resolve, reject) => {
        redis.get(id, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });

    return value ? JSON.parse(value) : defaultValue;
}

async function set(id, value) {
    value = JSON.stringify(value);

    return new Promise((resolve, reject) => {
        redis.set(id, value, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}
