const crypto = require('crypto')
const secret = crypto.randomBytes(32).toString('hex')

console.log(secret)  

// encrypt entity secret
const fetch = require('node-fetch');

let url = 'https://api.circle.com/v1/w3s/config/entity/publicKey';
let options = {
  method: 'GET',
  headers: {'Content-Type': 'application/json', Authorization: 'Bearer TEST_API_KEY:f62fc6ef35c2e6f2304e6be343912d8c:cf97dfe15f856bace2c3660b5bd09fdb'}
};

fetch(url, options)
  .then(res => res.json())
  .then(json => {

    url = 'https://api.circle.com/v1/w3s/developer/walletSets';
    options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: 'Bearer TEST_API_KEY:f62fc6ef35c2e6f2304e6be343912d8c:cf97dfe15f856bace2c3660b5bd09fdb'},
      body: JSON.stringify({
        idempotencyKey: '0',
        entitySecretCipherText: json.data.entitySecretCipherText,
        name: 'My Sample Wallet Set',
      })
    };

    return fetch(url, options)
      .then(res => res.json())
      .then(json => console.log(json))
      .catch(err => console.error('error:' + err));

  })
  .catch(err => console.error('error:' + err));

