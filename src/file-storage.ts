import path from "path";
import express from 'express';
import AWS from 'aws-sdk';
import * as expressTS from "express";
import {v4 as uuidv4} from 'uuid';
import {FileStored} from "./inteface/file-Storage";
import * as formidable from 'formidable';
import * as WebSocket from 'ws';

const logFN = path.join(__dirname, '_server.log');

let clients: any[] = [];

const portWS = 3003;

const socketServer = new WebSocket.Server({port: portWS});

const fsp = require('fs').promises;
const fs = require('fs');

const fileStoreListPath = path.join(process.cwd(), 'file-store.json');
const storePath = path.join(process.cwd(), 'file-storage');

const bodyParser = require('body-parser');

AWS.config.region = process.env.REGION
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(process.cwd(), 'static', 'public', 'file-store')));

app.get('/api/files', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const fileStoreList: FileStored[] = JSON.parse(await fsp.readFile(fileStoreListPath, 'utf-8'));
        res.setHeader('Cache-Control', 'no-cache');
        res.send(fileStoreList);
    } catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

app.get('/api/file', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const file = path.join(storePath, req.query.storageName as string);
        const filestream = fs.createReadStream(file);
        filestream.pipe(res);
    } catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

app.post('/api/upload', async (req: expressTS.Request, res: expressTS.Response) => {
    try {
        const fileStoreList: FileStored[] = JSON.parse(await fsp.readFile(fileStoreListPath, 'utf-8'));
        let newName: string = '';
        let userId: string = req.headers.authorization;
        const size = +req.header('content-length');
        let dowloaded = 0;
        req.on('data', chunk => {
            dowloaded += chunk.length;
            let progress = (dowloaded / size) * 100;
            const connection = clients.find(client => client.userId === userId)?.connection;
            console.log('on data connection', progress);
            connection?.send(Math.round(progress) + ' %');
        });

        req.on('end', async () => {
            try {
                const fileStoreList: FileStored[] = JSON.parse(await fsp.readFile(fileStoreListPath, 'utf-8'));
                fileStoreList.push({description, storageName: newName, userName});
                await fsp.writeFile(fileStoreListPath, JSON.stringify(fileStoreList));
                const client = clients.find(client => client.userId === userId);

                console.log('on end client', client?.userId);
                if (client) {
                    client.connection.send('destroy');
                    client.connection.terminate();
                    client.connection = null;
                }
                clients = clients.filter(client => client.connection);
            } catch (e) {
                console.error(e);
                res.status(500);
                res.send(e);
            }
        });

        const form = new formidable.IncomingForm();
        let description: string = '';
        let userName: string = '';

        form.uploadDir = storePath;

        form
            .on('file', function (fieldList, file) {
                newName = path.basename(file.path)
            })
            .on('field', function (field, value) {
                if (field === 'fileDescription') {
                    description = value;
                }
                if (field === 'fileName') {
                    userName = value;
                }
            })
            .on('error', (e) => {
                console.error(e);
                res.status(500);
                res.send(e);
            });
        form.parse(req);

    } catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

socketServer.on('connection', (connection: any) => {

    connection.send('init');

    connection.on('message', (message: string) => {
        if (message) {
            console.log('ws userId = ', message)
            clients.push({connection: connection, userId: message});
        }
    });
});

app.use('/static', express.static('static'));

const port = 3002;

const server = app.listen(port, function () {
    console.log('Server!!! running at http://127.0.0.1:' + port + '/');
});
