import axios from 'axios';
import { createClient } from 'redis';
import { v4 } from 'uuid';
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

const postSlashLunch = (req, res) => {
    const pollId = v4();
    const poll = buildPoll(lunchOptions, pollId);
    redis.set(pollId, JSON.stringify(poll));
    res.json({
        response_type: 'in_channel',
        blocks: poll,
    });
};

const postSlashVote = async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    console.log(payload.message.blocks);
    const poll = await updatePoll(payload.actions[0].block_id, payload.actions[0].value, payload.user);
    axios.post(payload.response_url, { replace_original: true, blocks: poll }).catch((err) => {
        console.error(err);
    });
    res.sendStatus(204);
};

const updatePoll = function(blockId, action, user) {
    return new Promise((resolve, reject) => {
        redis.get(blockId, async (err, poll) => {
            if (err) {
                reject(err);
            } else {
                let modifiedPoll = JSON.parse(poll);
                const buttons = [];
                modifiedPoll.forEach((section, index, obj) => {
                    if (section.block_id === blockId) {
                        buttons.push(section);
                        obj.splice(index, 1);
                    }
                });
                console.log(buttons);
                modifiedPoll = modifiedPoll.concat(await Promise.all(buttons.map((button, index) => {
                    return new Promise((resolve, reject) => {
                        if (button.accessory.value === action) {
                            let userResults = {};
                            redis.get(`${blockId}_polls`, (err, results) => {
                                if (err) {
                                    console.error(err);
                                } else if (!!results) {
                                    userResults = Object.assign(
                                        JSON.parse(results),
                                        { [user.id]: action }
                                    );
                                    // DO the things with userResults and updating poll
                                    redis.set(`${blockId}_polls`, JSON.stringify(userResults));
                                    button.text.text += ` <@${user.id}>`;
                                } else if (!results) {
                                    userResults = { [user.id]: action };
                                    redis.set(`${blockId}_polls`, JSON.stringify(userResults));
                                    button.text.text += ` <@${user.id}>`;
                                }
                                resolve(button);
                            });
                        }
                    });
                })));

                console.log('after');
                console.log(modifiedPoll);
                redis.set(blockId, JSON.stringify(modifiedPoll));
                resolve(modifiedPoll);
            }
        });
    });
};

const buildPoll = function(options, blockId) {
    const poll = [
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
            'block_id': blockId,
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
    return poll;
};

export { postSlashLunch, postSlashVote };
