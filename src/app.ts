import * as fs from "fs";

require('dotenv').config();

import {Worker} from "cluster";
import * as expressTS from 'express';
import path from "path";

const js2xmlparser = require("js2xmlparser");
const cluster = require('cluster');
const votesContent = path.join(process.cwd(), 'votes-content.json');
const votes = path.join(process.cwd(), 'votes.json');

function toHtmlFile(json: string): string {
    const file = JSON.parse(json);
    return `
    <!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
</head>
<body>
<ul>
<li><span>Winter</span>${file.winter}</li>
<li><span>Spring</span>${file.spring}</li>
<li><span>Summer</span>${file.summer}</li>
<li><span>Autumn</span>${file.autumn}</li>
</ul>
</html>
    `;
}

if (cluster.isMaster) {

    const cpuCount = require('os').cpus().length;

    for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    cluster.on('exit', (worker: Worker) => {

        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

} else {
    const AWS = require('aws-sdk');
    const express = require('express');
    const bodyParser = require('body-parser');

    AWS.config.region = process.env.REGION
    const app = express();

        app.use(express.static(path.join(process.cwd(), 'static', 'public')));

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.get('/api/variants', (req: expressTS.Request, res: expressTS.Response) => {
        const data = fs.readFileSync(votesContent, 'utf-8');
        res.send(JSON.parse(data));
    });

    app.get('/api/stat', (req: expressTS.Request, res: expressTS.Response) => {
        const data = fs.readFileSync(votes, 'utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(JSON.parse(data));
    });

    app.post('/api/vote', (req: expressTS.Request, res: expressTS.Response) => {
        try {
            const votesValue = JSON.parse(fs.readFileSync(votes, 'utf-8'));
            ++votesValue[req.body.value];
            fs.writeFileSync(votes, JSON.stringify(votesValue));
            res.send(200);
        } catch (e) {
            res.send(500);
        }
    });

    app.get('/api/file-state', (req: expressTS.Request, res: expressTS.Response) => {
        const data = fs.readFileSync(votes, 'utf-8');
        if (req.headers.accept === 'application/json') {
            res.send(data);
        }
        if (req.headers.accept === 'text/html') {
            console.log(toHtmlFile(data));
            res.send(toHtmlFile(data));
        }
        if (req.headers.accept === 'application/xml') {
            res.send(js2xmlparser.parse('person', JSON.parse(data)));
        }
    });

    const port = process.env.PORT || 7680;
    //if (process.env.NODE_ENV === 'development') {
    app.use('/static', express.static('static'));
    //}
    const server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}
