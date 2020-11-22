import path from "path";
import express from 'express';
import AWS from 'aws-sdk';
import * as expressTS from "express";
import {saveValidator} from "./midlaware/saveValidator";
import { v4 as uuidv4 } from 'uuid';
import {PostmanRequest} from "./inteface/requests";
import fetch from "isomorphic-fetch";


const fsp = require('fs').promises;

const requestsPath = path.join(process.cwd(), 'requests.json');

const bodyParser = require('body-parser');

AWS.config.region = process.env.REGION
const app = express();
app.use(bodyParser.json());
app.use(saveValidator);
app.use(express.static(path.join(process.cwd(), 'static', 'public', 'postman')));

app.post('/api/save', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const requests: PostmanRequest[] = JSON.parse(await fsp.readFile(requestsPath, 'utf-8'));
        const newRequest: PostmanRequest = {...req.body.value, id: uuidv4()};
        requests.push(newRequest);
        await fsp.writeFile(requestsPath, JSON.stringify(requests));
        res.send(200);
    } catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

app.get('/api/requests', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const data = await fsp.readFile(requestsPath, 'utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(JSON.parse(data));
    }catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }

});

app.post('/api/start', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const requests: PostmanRequest[] =  JSON.parse(await fsp.readFile(requestsPath, 'utf-8'));
        const startingRequest: PostmanRequest = requests.find(request=>request.id===req.body.id);
        const responseData = await sendData(startingRequest);
        res.send(responseData);
    }catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

const port = 3002;
//if (process.env.NODE_ENV === 'development') {
app.use('/static', express.static('static'));
//}
const server = app.listen(port, function () {
    console.log('Server!!! running at http://127.0.0.1:' + port + '/');
});

async function sendData(postmanRequest: PostmanRequest) {
    // Default options are marked with *
    try {
        const postmanHeaders: any = {};
        postmanRequest.headers.forEach(header=>postmanHeaders[header.key] = header.value)
        const postmanBody: any = {};
        if(postmanRequest.body) postmanBody.body = postmanRequest.body;
        const response = await fetch(postmanRequest.url+postmanRequest.params, {
            method: postmanRequest.method,
            headers: {
                'Content-Type': postmanRequest.contentType || 'form-data',
                ...postmanHeaders
            },
            ...postmanBody
        });
        const resultHeaders: any = {};
        for (let [key, value] of response.headers) {
            resultHeaders[key] = value;
        }
        const resultBody = await response.json();
        return {body: resultBody, headers: resultHeaders};
    } catch (e) {
        return e;
    }
}
