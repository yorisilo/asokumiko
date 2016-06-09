const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const async = require('async');
const status = {}; // context保存用

app.set('port', (process.env.PORT || 8000));
app.use(bodyParser.json());

app.post('/linebot/callback', (req, res) => {
  async.waterfall(
    [
      (callback) => {
        // docomo API
        const apiURL = 'https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=';
        const apiKEY = process.env.DOCOMO_API_KEY;

        const json = req.body;
        const responseMsg = json['result'][0]['content']['text'];

        const docomoOptions = {
          url: apiURL + apiKEY,
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          },
          body: {
            utt: responseMsg,
            context: status.context,
            mode: status.mode
          },
          json: true
        };

        request.post(docomoOptions, (err, response, data) => {
          if (!err && response.statusCode == 200) {
            const body = data;
            status.context = body.context;
            status.mode = body.mode;

            callback(null, json, body.utt);
          } else {
            console.log('エラーです！');
          }
        });
      }
    ],

    // LINE BOT
    (err, json, resultMsg) => {
      if (err) {
        return;
      }

      const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Line-ChannelID': process.env.LINE_CHANNEL_ID,
        'X-Line-ChannelSecret': process.env.LINE_CHANNEL_SECRET,
        'X-Line-Trusted-User-With-ACL': process.env.LINE_CHANNEL_MID
      };

      const to_array = [];
      to_array.push(json['result'][0]['content']['from']);

      const sendData = {
        'to': to_array,
        'toChannel': 1383378250,           // 固定らしい
        'eventType': '138311608800106203', // 固定らしい
        "content": {
          contentType: 1,
          toType: 1,
          text: resultMsg
        }
      };

      const options = {
        url: 'https://trialbot-api.line.me/v1/events',
        proxy: process.env.FIXIE_URL,
        headers: headers,
        json: true,
        body: sendData
      };

      request.post(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body);
        } else {
          console.log('error: ' + JSON.stringify(response));
        }
      });
    }
  );
});

// 動作確認用
app.listen(app.get('port'), function() {
  console.log('Node app is running');
});
