// The following environment variables are set by app.yaml (app.flexible.yaml or
// app.standard.yaml) when running on Google App Engine,
// but will need to be manually set when running locally.
const {SENDGRID_API_KEY} = process.env;
const {SENDGRID_SENDER} = process.env;
const Sendgrid = require('@sendgrid/client');

Sendgrid.setApiKey(SENDGRID_API_KEY);

exports.sendMessage = async function(message, callback) {
    const request = {
        method: 'POST',
        url: '/v3/mail/send',
        body: {
          personalizations: [
            {
              to: [{email: message.to}],
              subject: message.subject,
            },
          ],
          from: {email: SENDGRID_SENDER},
          content: [
            {
              type: 'text/plain',
              value: message.body,
            },
          ],
        },
    };
    
    try {
        await Sendgrid.request(request);
        callback("Sent");
    } catch (err) {
        console.log("mail.sendWelcome() ERROR "  + err);
        callback("Error");
    }
}