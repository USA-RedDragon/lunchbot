import axios from 'axios';
import { createClient } from 'redis';
import uuid from 'uuid/v4';
import _ from 'lodash';
const redis = createClient();

const lunchOptions = [
    'Sunnyside',
    'Tuckers',
    '1492',
    'Hobbys Hoagies',
    'Neptunes',
    'Fassler Hall',
    'Waffle Champion',
    'Sala Thai',
    'Backdoor BBQ',
    'Pizza 23',
];

export async function postSlashLunch(req, res) {
    const pollId = uuid();
    const poll = buildPoll(lunchOptions, pollId);

    await set(pollId, poll);
    res.json({
        response_type: 'in_channel',
        blocks: poll,
    });
};

export async function postSlashVote(req, res) {
    const payload = JSON.parse(req.body.payload);
    const { block_id } = payload.actions[0];
    const { pollId, buttonId } = parseIds(block_id);

    await updateUserSelection(pollId, buttonId, payload.user);
    const poll = await refreshPoll(pollId);

    await axios.post(payload.response_url, { replace_original: true, blocks: poll });

    res.sendStatus(204);
};

async function updateUserSelection(pollId, buttonId, user) {
    const userSelection = await get(`${pollId}_userSelection`);
    _.set(userSelection, user.id, buttonId);
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

    return poll.map(pollItem => {
        if (!pollItem.accessory || pollItem.accessory.type !== 'button') return pollItem;

        const { buttonId } = parseIds(pollItem.block_id);
        if (mappedUserSelection[buttonId]) {
            pollItem.text.text = mappedUserSelection[buttonId]
                .map((user) => `<@${user}>`)
                .join(',');
        }

        return pollItem;
    });
}

function buildPoll(options, pollId) {
    return [
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': 'Where should we eat lunch?\n\n *Please select a restaurant:*',
            },
        },
        {
            'type': 'divider',
        },
        // Restaurants
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': '*Sunnyside Diner*\n4.4 Stars :star::star::star::star: 939 reviews\n Upbeat place for area-sourced, homemade comfort food like blueberry pancakes & meatloaf sandwiches.',
            },
            'accessory': {
                'type': 'image',
                'image_url': 'https://lh5.googleusercontent.com/p/AF1QipNWlKxCQ-7uGggj5lm8CwjgYZlh4rortMbVj1TT=w284-h160-k-no',
                'alt_text': 'alt text for image',
            },
        },
        {
            'type': 'divider',
        },
        // Buttons
        {
            'type': 'section',
            'block_id': `${pollId}:${uuid()}`,
            'text': {
                'type': 'mrkdwn',
                'text': 'No votes',
            },
            'accessory': {
                'type': 'button',
                'text': {
                    'type': 'plain_text',
                    'text': 'Sunnyside Diner',
                },
                'value': 'sunnyside_diner',
            },
        },
        {
            'type': 'section',
            'block_id': `${pollId}:${uuid()}`,
            'text': {
                'type': 'mrkdwn',
                'text': 'No votes',
            },
            'accessory': {
                'type': 'button',
                'text': {
                    'type': 'plain_text',
                    'text': 'Sunnyside Diner 2.0',
                },
                'value': 'sunnyside_diner_20',
            },
        },
    ];
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
