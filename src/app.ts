require('dotenv').config();

import {Worker} from "cluster";
import * as expressTS from 'express';

const cluster = require('cluster');


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

    app.set('view engine', 'ejs');
    const rootPass = __dirname.slice(0,-5);
    app.set('views', rootPass + '/views');
    app.use(bodyParser.urlencoded({extended:false}));

    app.get('/', (req: expressTS.Request, res: expressTS.Response) => {
        res.render('index', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false',
            actionUrl: `http://${req.headers.host + req.url}signup`,
            name: '',
            email: '',
            validationNameText: '',
            validationEmailText: '',
        });
    });

    app.post('/signup', (req: expressTS.Request, res: expressTS.Response) => {
        if (req.body.name.length <= 2 || req.body.email.length <= 5 || !req.body.email.includes('@')) {
            const validationNameText = req.body.name.length <= 2 ? 'Should be longer then 2 symbols' : '';
            const validationEmailText = req.body.email.length <= 5 || !req.body.email.includes('@') ? 'Should be longer than 5 symbols, and contain @' : '';
            res.render('index', {
                static_path: 'static',
                theme: process.env.THEME || 'flatly',
                flask_debug: process.env.FLASK_DEBUG || 'false',
                actionUrl: `http://${req.headers.host + req.url}`,
                validationNameText,
                validationEmailText,
                name: req.body.name,
                email: req.body.email,
            });
        } else {
            res.send(`signup ok, name=${req.body.name} email=${req.body.email}, previewAccess=${req.body.previewAccess}`);
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
