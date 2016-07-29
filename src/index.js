/**
 * Description:
 *   Modify review flags for GitHub Pull Requests
 *
 * Dependencies:
 *   "ramda": "0.21.0"
 *
 * Configuration:
 *   HUBOT_GITHUB_TOKEN
 *   HUBOT_GITHUB_REPO
 *
 * Commands:
 *   hubot r? <pull_request_number> - removes review labels and sets "review requested"
 *   hubot r+ <pull_request_number> - removes review labels and sets "review granted"
 *   hubot r- <pull_request_number> - removes review labels and sets "review returned"
 *
 * Notes:
 *   None
 *
 * Author:
 *   eliperelman
 */

const R = require('ramda');

const URL = `https://api.github.com/repos/${process.env.HUBOT_GITHUB_REPO}/issues`;
const REQUEST = '?';
const GRANT = '+';
const RETURN = '-';

const labels = {
  [REQUEST]: 'review requested',
  [GRANT]: 'review granted',
  [RETURN]: 'review returned'
};

const messages = {
  [REQUEST]: (number) => `I requested a review on pull request #${number}     ◟(๑•͈ᴗ•͈)◞`,
  [GRANT]: (number) => `Review granted for pull request #${number}     ୧( ⁼̴̶̤̀ω⁼̴̶̤́ )૭`,
  [RETURN]: (number) => `I returned pull request #${number} for revision     ＿〆(。。)`,
  error: () => 'I tried modifying that pull request, but something went wrong     ;_;'
};

/**
 * Request :: Object -> String -> String -> a | Undefined -> Promise
 */
const Request = R.curry((robot, method, url, data = '') => {
  const request = robot
    .http(url)
    .header('Content-Type', 'application/json')
    .header('Accept', 'application/vnd.github.v3+json')
    .header('User-Agent', 'GitHubot/1.0.0')
    .header('Authorization', `token ${process.env.HUBOT_GITHUB_TOKEN}`)
    [method.toLowerCase()](JSON.stringify(data));

  return new Promise((resolve, reject) => {
    request((err, response, body) => err ? reject(err) : resolve({ response, body }));
  });
});

/**
 * Api :: Object -> Object
 */
const Api = (robot) => {
  const request = Request(robot);

  return {
    /**
     * add :: String -> Number -> Promise Object
     */
    add: (label, number) => request('POST', `${URL}/${number}/labels`, [label]),
    /**
     * remove :: String -> Number -> Promise Object
     */
    remove: (label, number) => request('DELETE', `${URL}/${number}/labels/${label}`, '')
  };
};

module.exports = (robot) => {
  const { add, remove } = Api(robot);

  // List for "r", followed by a flag of ?, +, or -, followed by a space, followed by a number.
  robot.respond(/r([?+-]) ([\d]+)/, (response) => {
    const [, flag, number] = response.match;

    // For each key in labels, determine if the key matches the mentioned flag.
    // If it matches, return an add() request for the label,
    // otherwise return a remove() request for the label.
    const promises = R.mapObjIndexed((label, labelFlag) => R.cond([
      [R.equals(flag), () => add(label, number)],
      [R.T, () => remove(label, number)]
    ])(labelFlag), labels);

    Promise
      .all(R.values(promises))
      .then(() => response.send(messages[flag](number)))
      .catch(() => response.send(messages.error()));
  });
};
