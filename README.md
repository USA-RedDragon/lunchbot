# Lunchbot

## A Slack bot for deciding lunch

### Running locally

This runs on port 6500 by default, you can override it with the PORT environment variable

I run this with Node.JS 10.15

`npm run start` will run the server with `nodemon`
`npm run lint` will lint with `eslint`
`npm run lint:fix` will lint with `eslint --fix`

To start ngrok listening on port 6500, use `ngrok http 6500`
