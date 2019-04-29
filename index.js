const axios = require('axios');
const S3 = require('aws-sdk/clients/s3');

const phoneNumberFrom = process.env.phoneNumberFrom;
const phoneNumberTo = process.env.phoneNumberTo;
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;

const twilioClient = require('twilio')(accountSid, authToken);
const s3Client = new S3({ apiVersion: '2006-03-01', region: 'us-east-2' });

const MARK_INDEX_THRESHOLD = parseInt(process.env.MARK_INDEX_THRESHOLD, 10);
const PRICE_CHANGE_THRESHOLD = parseInt(process.env.PRICE_CHANGE_THRESHOLD, 10);
const NUM_TIME_SLICES = parseInt(process.env.NUM_TIME_SLICES, 10);

async function handler() {
  const { data: { result: { index_price, mark_price } } } = await getTicker();
  const stats = await getStats();
  const minVal = Math.min(...stats);
  const maxVal = Math.max(...stats);
  const minDif = Math.abs(minVal - index_price);
  const maxDif = Math.abs(maxVal - index_price);
  const markIndexDif = Math.abs(mark_price - index_price);

  console.log('data was: ', { index_price, mark_price });
  console.log('stats were: ', stats);

  // Alert: when current price less than period max and by amount >= threshold
  if (mark_price < maxVal && maxDif >= PRICE_CHANGE_THRESHOLD) {
    sendAlert(`Crypto Alert! BTC Perpetual: price decrease crossed threshold, current = ${mark_price.toFixed(2)}, max was = ${maxVal.toFixed(2)}`)
  }

  // Alert: when current price greather than period min and by amount >= threshold
  if (mark_price > minVal && minDif >= PRICE_CHANGE_THRESHOLD) {
    sendAlert(`Crypto Alert! BTC Perpetual: price increase crossed threshold, current = ${mark_price.toFixed(2)}, min was = ${minVal.toFixed(2)}`)
  }

  // Alert: when mark price varies drastically from index price - usually would happen on mass covering of positions
  if (markIndexDif >= MARK_INDEX_THRESHOLD) {
    sendAlert(`Crypto Alert! BTC Perpetual: mark/index difference: ${markIndexDif.toFixed(2)}`);
  }

  updateStats(stats, index_price);
}

const getTicker = () => {
  return axios.get('https://test.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL');
};

async function getStats() {
  const params = {
    Bucket: "crypto-alarms", 
    Key: "btc-perpetual"
  };
  const response = await s3Client.getObject(params).promise();
  const result = response.Body.toString('utf8');
  return JSON.parse(result);
}

const updateStats = (stats, index_price) => {
  const newStats = [index_price, ...stats].slice(0, NUM_TIME_SLICES);
  const params = {
    Body: JSON.stringify(newStats), 
    Bucket: "crypto-alarms", 
    Key: "btc-perpetual"
  };
   
  s3Client.putObject(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

const sendAlert = body => {
  console.log(body);
  twilioClient.messages
    .create({from: phoneNumberFrom, body, to: phoneNumberTo })
    .then(message => console.log(message.sid));
}

module.exports = {
  handler
};
