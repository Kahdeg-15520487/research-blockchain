const express = require('express');
const fs = require('fs');
const Web3 = require('web3');
const { randomHex } = require("web3-utils");
const ethereumjs = require('ethereumjs-tx');
const Tx = require('ethereumjs-tx').Transaction;
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const secret = JSON.parse(fs.readFileSync("secret.json").toString());

// connect to Infura node
const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/' + secret.projectId))

const privateKey = Buffer.from(secret.privateKey, 'hex');

const abi = JSON.parse(fs.readFileSync("blockchain/store_str.json").toString());

const contract = new web3.eth.Contract(abi.abi, secret.address);
console.log(contract);

app.get('/', (req, res) => res.send('Hello World!'))
app.get('/abi', (req, res) => res.send(abi));
app.get('/bal', (req, res) => {
    web3.eth.getBalance(secret.from, "latest")
        .then(t => res.send(t));
})

app.post('/send', (req, res) => {
    const sendData = {
        from: secret.from,
        to: req.body.to,
        value: req.body.value,
    }

    console.log(sendData);

    send(sendData).then(() => { }, reason => console.log(reason));

    res.send('posted');
})

app.listen(port, () => console.log(`App listening on port ${port}!`));

async function send(sendData) {
    console.log(sendData);
    const from = sendData.from;
    const nonce = await web3.eth.getTransactionCount(from, "pending");
    let gas = await contract.methods
        .createValue(sendData.value)
        .estimateGas({ from, gas: "1000000", data: sendData.value });

    const data = contract.methods.createValue(sendData.value).encodeABI();

    gas = Math.round(gas * 1.5);
    try {
        const rawTx = {
            nonce: nonce,
            gasPrice: gas,
            gasLimit: 1000000,
            to: secret.address,
            data: data
        };
        const tx = new Tx(rawTx, {'chain':4});
        tx.sign(privateKey);
        console.log(rawTx)
        const serializedTx = '0x' + tx.serialize().toString('hex');
        console.log(serializedTx);
        result = await web3.eth.sendSignedTransaction(serializedTx).on('receipt', console.log);

        console.log("success");
        console.log(result);
    } catch (e) {
        console.log("error", e);
    }
}