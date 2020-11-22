import * as expressTS from "express";
import {PostmanRequest} from "../inteface/requests";

const urlReg: RegExp = new RegExp('^(?:http(s)?:\\/\\/)?[\\w.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:/#[\\]@!\'\\(\\)\\*\\+,;.]+$');
const methodReg: RegExp = new RegExp('^GET|POST|DELETE|PUT$');
const paramsReg: RegExp = new RegExp('(^\\?((.*=.*)(&?))+)|(^$)');
const contentType: RegExp = new RegExp('^form-data|x-www-form-urlencoded|raw|binary|GraphQL$');

export const saveValidator = (req: expressTS.Request, res: expressTS.Response, next: expressTS.NextFunction): void => {
    if (req.url === '/api/save') {
        let error = '';
        const value: PostmanRequest = req.body.value;
        if (!value.name) error += 'Name is required.';
        if (!urlReg.test(value.url)) error += ' URL is invalid.';
        if (!methodReg.test(value.method)) error += ' Method not supported.';
        if (!paramsReg.test(value.params)) error += ' Params is invalid.';
        if (value.body && !contentType.test(value.contentType)) error += ' ContentType is invalid.';
        if (value.method==='GET' && value.body) error += ' Request with method get can\'t contains body.';
        if (error) {
            res.status(400);
            res.send(error);
        }else {
            next();
        }
    } else
        next();
}
